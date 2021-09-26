const { server_info, rtsp_method } = require('../util/rtsp_options');
const rtsp_session = require('./rtsp_session');
const rtsp_states = require('./rtsp_states');
const sdp_session = require('../sdp/sdp_session');
const events = require('events');
const tcp = require('net');
const udp = require('dgram');
const rtsp_router = require('./rtsp_router');
const crypto = require('crypto');
const Mutex = require('async-mutex').Mutex;

let rtsp_server = (function (){

    function rtsp_server(){
        let self = this;
        this.rtsp_server = tcp.createServer();
        this.rtp_server = udp.createSocket('udp4');
        this.rtcp_server = udp.createSocket('udp4');
        this.router = new rtsp_router();
        this.router.options(function (req, res){
            console.log('Sending: '+res.toString());
            self.send(req.session, res);
        });
        this.tcp_connections = {};
        this.rtsp_sessions = {};
        this.stream_track = {};
        this.write_to_stream = {};
        this.em = new events.EventEmitter();
        this.stream_mutex = new Mutex();
    }

    function stream_content_tcp_interleaved(data, remoteAddress, remotePort){
        let self = this;
        mutex_operation.call(self, function () {
            self.write_to_stream[remoteAddress+'-'+remotePort+'-'+'/interleaved'].forEach((tcpSessionId) => {
                self.send(tcpSessionId, data);
            });
        });
    }

    function stream_content_udp(data, info, type){
        let self = this;
        let address = info.address;
        let port = info.port;
        let streamId = address+'-'+port.toString();
        switch (type) {
            case 0:
                mutex_operation.call(self, function(){
                    if(self.write_to_stream[streamId + '/rtp']) {
                        self.write_to_stream[streamId + '/rtp'].forEach((rtpInfo) => {
                            self.rtp_server.send(data, rtpInfo['port'], rtpInfo['ip'], function (error) {
                                if (error) console.log(error);
                            });
                        });
                    }
                });
                break;
            case 1:
                mutex_operation.call(self, function () {
                    if(self.write_to_stream[streamId + '/rtcp']) {
                        self.write_to_stream[streamId + '/rtcp'].forEach((rtcpInfo) => {
                            self.rtcp_server.send(data, rtcpInfo['port'], rtcpInfo['ip'], function (error) {
                                if (error) console.log(error);
                            });
                        });
                    }
                });
                break;
        }
    }

    function read_stream_interleaved(data, startingIndex){
        let packetStart = 0x24;
        while(data[startingIndex] === packetStart){
            let auxIndex = startingIndex + 4;
            let length = data.slice(startingIndex+2, startingIndex+4).readUInt16BE(0);
            startingIndex += length + 4;
            if(startingIndex > data.length) {
                return {'stream_interleaved': true, 'next_index': length - (data.length - auxIndex)};
            }
        }
        if(startingIndex === data.length)
            return {'stream_interleaved': true, 'next_index': 0};
        else
            return {'stream_interleaved': false, 'next_index': startingIndex};
    }

    function udp_stream_stop_and_play(stream_track_0, stream_track_1, rtsp_session, session_ip, callback){
        if(stream_track_0 !== undefined) {
            let rtpPort0 = rtsp_session.client_port_rtp_stream0;
            let rtcpPort0 = rtsp_session.client_port_rtcp_stream0;
            let readStreamRtpId0 = stream_track_0.ip_origin + '-' + stream_track_0.rtp_port;
            let readStreamRtcpId0 = stream_track_0.ip_origin + '-' + stream_track_0.rtcp_port;
            callback.call(this, readStreamRtpId0 + '/rtp', readStreamRtcpId0 + '/rtcp', session_ip, rtpPort0, rtcpPort0);
        }
        if(stream_track_1 !== undefined) {
            let rtpPort1 = rtsp_session.client_port_rtp_stream1;
            let rtcpPort1 = rtsp_session.client_port_rtcp_stream1;
            let readStreamRtpId1 = stream_track_1.ip_origin + '-' + stream_track_1.rtp_port;
            let readStreamRtcpId1 = stream_track_1.ip_origin + '-' + stream_track_1.rtcp_port;
            callback.call(this, readStreamRtpId1 + '/rtp', readStreamRtcpId1 + '/rtcp', session_ip, rtpPort1, rtcpPort1);
        }
    }

    function udp_write_stream_out(rtpStreamId, rtcpStreamId, destinationIp, rtpPort, rtcpPort){
        let self = this;
        if(this.write_to_stream[rtpStreamId]) {
            mutex_operation.call(self, function () {
                self.write_to_stream[rtpStreamId].push({'ip': destinationIp, 'port': rtpPort});
            })
        }
        if(this.write_to_stream[rtcpStreamId]) {
            mutex_operation.call(self, function () {
                self.write_to_stream[rtcpStreamId].push({'ip': destinationIp, 'port': rtcpPort});
            })
        }
    }

    function udp_stop_stream_out(rtpStreamId, rtcpStreamId, destinationIp, rtpPort, rtcpPort){
        let self = this;
        if(this.write_to_stream[rtpStreamId]){
            mutex_operation.call(self, function () {
                for(let clients = 0; clients < self.write_to_stream[rtpStreamId].length; clients++){
                    let client = self.write_to_stream[rtpStreamId][clients];
                    if(client.ip === destinationIp && client.port === rtpPort){
                        delete self.write_to_stream[rtpStreamId][clients];
                        break;
                    }
                }
            });
        }
        if(this.write_to_stream[rtcpStreamId]){
            mutex_operation.call(self, function () {
                for(let clients = 0; clients < self.write_to_stream[rtcpStreamId].length; clients++){
                    let client = self.write_to_stream[rtcpStreamId][clients];
                    if(client.ip === destinationIp && client.port === rtcpPort){
                        delete self.write_to_stream[rtcpStreamId][clients];
                        break;
                    }
                }
            });
        }
    }

    function tcp_stream_stop_and_play(stream_track_0, stream_track_1, session_id, callback){
        let stream_track = (stream_track_0 === undefined)? stream_track_1 : stream_track_0;
        let read_stream_rtsp_interleaved = stream_track.ip_origin + '-' + stream_track.tcp_port + '-' + '/interleaved';
        if(this.write_to_stream[read_stream_rtsp_interleaved]) {
            let self = this;
            mutex_operation.call(self, function () {
                callback.call(self, read_stream_rtsp_interleaved, session_id);
            })
        }
    }

    function tcp_write_stream_out(read_stream_rtsp_interleaved, session_id){
        this.write_to_stream[read_stream_rtsp_interleaved].push(session_id);
    }

    function tcp_stop_stream_out(read_stream_rtsp_interleaved, session_id){
        for(let clients = 0; clients < this.write_to_stream[read_stream_rtsp_interleaved].length; clients++){
            let clientSessionId = self.write_to_stream[read_stream_rtsp_interleaved][clients];
            if(clientSessionId === session_id){
                delete this.write_to_stream[read_stream_rtsp_interleaved][clients];
                break;
            }
        }
    }

    rtsp_server.prototype.play_stream = function (stream_path, session_id){
        let stream_track_0 = this.stream_track[stream_path+'/streamid=0'];
        let stream_track_1 = this.stream_track[stream_path+'/streamid=1'];
        let current_rtsp_session = this.rtsp_sessions[session_id];
        let current_tcp_session_ip = this.tcp_connections[session_id].address().address;
        if(current_rtsp_session.setup_stream_interleaved) {
            tcp_stream_stop_and_play.call(this, stream_track_0, stream_track_1, session_id, tcp_write_stream_out);
        }
        else {
            udp_stream_stop_and_play.call(this, stream_track_0, stream_track_1, current_rtsp_session, current_tcp_session_ip, udp_write_stream_out);
        }
    }

    rtsp_server.prototype.pause_stream = function(stream_path, session_id){
        let stream_track_0 = this.stream_track[stream_path+'/streamid=0'];
        let stream_track_1 = this.stream_track[stream_path+'/streamid=1'];
        let current_rtsp_session = this.rtsp_sessions[session_id];
        let current_tcp_session_ip = this.tcp_connections[session_id].address().address;
        if(current_rtsp_session.setup_stream_interleaved) {
            tcp_stream_stop_and_play.call(this, stream_track_0, stream_track_1, session_id, tcp_stop_stream_out);
        }
        else {
            udp_stream_stop_and_play.call(this, stream_track_0, stream_track_1, current_rtsp_session, current_tcp_session_ip, udp_stop_stream_out);
        }
    }

    rtsp_server.prototype.teardown_stream = function(stream_path, session_id){
        let self = this;
        let stream_track_0 = this.stream_track[stream_path+'/streamid=0'];
        let stream_track_1 = this.stream_track[stream_path+'/streamid=1'];
        let curr_rtsp_session = this.rtsp_sessions[session_id];
        if(curr_rtsp_session.session_state === rtsp_states.RECORD){
            //if recording then get rid of stream in different way
            //check if it is interleaved
            if(curr_rtsp_session.setup_stream_interleaved){
                mutex_operation.call(this, function () {
                    let stream_track = (stream_track_0 === undefined)? stream_track_1 : stream_track_0;
                    delete self.write_to_stream[stream_track.ip_origin+'-'+stream_track.tcp_port+'-'+'/interleaved'];
                    delete sdp_session.sdp_sessions[stream_path];
                    delete self.rtsp_sessions[session_id];
                    self.tcp_connections[session_id].destroy();
                    delete self.tcp_connections[session_id];
                });
            }
            else {
                mutex_operation.call(this, function () {
                    if(stream_track_0 !== undefined){
                        delete self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtp_port + '/rtp'];
                        delete self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtcp_port + '/rtcp'];
                    }
                    if(stream_track_1 !== undefined){
                        delete self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtp_port + '/rtp'];
                        delete self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtcp_port + '/rtcp'];
                    }
                    delete sdp_session.sdp_sessions[stream_path];
                    delete self.rtsp_sessions[session_id];
                    self.tcp_connections[session_id].destroy();
                    delete self.tcp_connections[session_id];
                });
            }
        }
        else{
            //if playing then remove it a different way
            //check if im playing it interleaved
            if(curr_rtsp_session.setup_stream_interleaved){
                mutex_operation.call(this, function () {
                    let stream_track = (stream_track_0 === undefined)? stream_track_1 : stream_track_0;
                    let index = self.write_to_stream[stream_track.ip_origin+'-'+stream_track.tcp_port+'-'+'/interleaved'].indexOf(session_id);
                    if (index > -1) {
                        self.write_to_stream[stream_track.ip_origin+'-'+stream_track.tcp_port+'-'+'/interleaved'].splice(index, 1);
                    }
                    delete self.rtsp_sessions[session_id];
                    self.tcp_connections[session_id].destroy();
                    delete self.tcp_connections[session_id];
                });
            }
            else{
                mutex_operation.call(this, function () {
                    let curr_tcp_sock = self.tcp_connections[session_id];
                    let conn = {'ip': curr_tcp_sock.address().address, 'port': curr_tcp_sock.address().port};
                    if(stream_track_0 !== undefined){
                        let rtpIndex0 = self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtp_port + '/rtp'].indexOf(conn);
                        if(rtpIndex0 > -1){
                            self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtp_port + '/rtp'].splice(rtpIndex0, 1);
                        }
                        let rtcpIndex0 = self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtcp_port + '/rtcp'].indexOf(conn);
                        if(rtcpIndex0 > -1){
                            self.write_to_stream[stream_track_0.ip_origin + '-' + stream_track_0.rtcp_port + '/rtcp'].splice(rtcpIndex0, 1);
                        }
                    }
                    if(stream_track_1 !== undefined){
                        let rtpIndex1 = self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtp_port + '/rtp'].indexOf(conn);
                        if(rtpIndex1 > -1){
                            self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtp_port + '/rtp'].splice(rtpIndex1, 1);
                        }
                        let rtcpIndex1 = self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtcp_port + '/rtcp'].indexOf(conn);
                        if(rtcpIndex1 > -1){
                            self.write_to_stream[stream_track_1.ip_origin + '-' + stream_track_1.rtcp_port + '/rtcp'].splice(rtcpIndex1, 1);
                        }
                    }
                    delete self.rtsp_sessions[session_id];
                    self.tcp_connections[session_id].destroy();
                    delete self.tcp_connections[session_id];
                });
            }
        }
    }

    function rtsp_process_data(session, data){
        session.process_rtsp_data(data).then((rtsp_packet) => {
            if (rtsp_packet.method === rtsp_method.announce) {
                this.router.setup_routes(rtsp_packet.url, this);
            }
            this.em.emit('procData', rtsp_packet);
        }).catch(function (error) {
            console.error(error.stack);
            console.log('Error processing RTSP data');
        });
    }

    function mutex_operation(callback){
        let self = this;
        self.stream_mutex
            .waitForUnlock()
            .then(() => {
                self.stream_mutex
                    .acquire()
                    .then(function (resolve) {
                       callback();
                       resolve();
                    });
            });
    }

    rtsp_server.prototype.send = function(conn_id, buff){
        this.tcp_connections[conn_id].write(buff);
    }

    rtsp_server.prototype.listen = function(rtsp_port, rtp_port, rtcp_port){
        let self = this;
        this.em.on('procData', function (rtsp_packet) {
            self.router.rtsp_requests.every(function (route) {
                if(rtsp_packet.method === route.method
                    && route.method === rtsp_method.options){
                    route.callback(rtsp_packet, rtsp_packet.mount_response_packet());
                    return false;
                }
                else if(rtsp_packet.method === route.method
                    && rtsp_packet.url === route.path) {
                    route.callback(rtsp_packet, rtsp_packet.mount_response_packet());
                    return false;
                }
                return true;
            });
        });

        this.rtp_server.bind(rtp_port);
        this.rtcp_server.bind(rtcp_port);
        //Confirm RTSP/RTP/RTCP Servers are ready
        this.rtsp_server.listen(rtsp_port, '127.0.0.1', function(){
            console.log('RTSP Server created\r\n');
            server_info(self.rtsp_server)
        });
        this.rtp_server.on('listening', function () {
            console.log('RTP Server created\r\n');
            server_info(self.rtp_server)
        })
        this.rtcp_server.on('listening', function () {
            console.log('RTCP Server created\r\n');
            server_info(self.rtcp_server)
        })

        this.rtp_server.on('message', function (msg, rinfo) {
            stream_content_udp.call(self, msg, rinfo, 0)
        });
        this.rtcp_server.on('message', function (msg, rinfo) {
            stream_content_udp.call(self, msg, rinfo, 1)
        });

        this.rtp_server.on('error', function(error){
            console.log('RTP Server Error: ' + error);
            self.rtp_server.close();
        });
        this.rtcp_server.on('error', function(error){
            console.log('RTCP Server Error: ' + error);
            self.rtcp_server.close();
        });

        this.rtp_server.on('close', function () {
            console.log('CLOSED RTP SOCKET');
        });

        this.rtcp_server.on('close', function () {
            console.log('CLOSED RTCP SOCKET');
        });

        this.rtsp_server.on('connection', function (socket) {
            let session_id = parseInt(crypto.randomBytes(8).toString('hex'), 16).toString(10);
            let ssrc = crypto.randomBytes(4).toString('hex');
            let session = new rtsp_session(rtp_port, rtcp_port, session_id, ssrc);
            self.tcp_connections[session_id] = socket;
            self.rtsp_sessions[session_id] = session;

            socket.on('data', function(data) {
                if (session.setup_stream_interleaved && session.session_state === rtsp_states.RECORD) {
                    session.read_stream_interleaved = read_stream_interleaved(data, session.read_stream_interleaved.next_index);
                    if(!session.read_stream_interleaved.stream_interleaved){
                        console.log('Received: ' + data.slice(session.read_stream_interleaved.next_index, data.length));
                        rtsp_process_data.call(self, session, data.slice(session.read_stream_interleaved.next_index, data.length));
                    }
                    else {
                        stream_content_tcp_interleaved.call(self, data, socket.remoteAddress, socket.remotePort);
                    }
                } else {
                    console.log('Received: ' + data.toString());
                    rtsp_process_data.call(self, session, data);
                }
            })

            socket.on('error', function (err) {
               console.log('Client ended abruptly, cleaning session');
               if(session.session_state === rtsp_states.PLAY || session.session_state === rtsp_states.RECORD)
                   self.teardown_stream(session.stream_path, session_id);
            });

        });
    }

    return rtsp_server;
})();

module.exports = rtsp_server;