const { rtsp_method } = require('../util/rtsp_options');
const rtsp_states = require('./rtsp_states');
const sdp_session = require('../sdp/sdp_session');
const stream_track = require('../stream/stream_track');

let request_route = (function (){

    function request_route(method, path, callback){
        this.method = method;
        this.path = path;
        this.callback = callback;
    }

    return request_route;
})();

let rtsp_router = (function (){

    function rtsp_router(){
        this.rtsp_requests = [];
    }

    rtsp_router.prototype.options = function (callback) {
        save_route.call(this, rtsp_method.options, '*', callback);
    }

    function save_route(method, path, callback){
        this.rtsp_requests.push(new request_route(method, path, callback));
    }

    function describe(path, callback){
        save_route.call(this, rtsp_method.describe, path, callback);
    }

    function announce(path, callback){
        save_route.call(this, rtsp_method.announce, path, callback);
    }

    function setup(path, callback){
        save_route.call(this, rtsp_method.setup, path, callback);
    }

    function record(path, callback){
        save_route.call(this, rtsp_method.record, path, callback);
    }

    function play(path, callback){
        save_route.call(this, rtsp_method.play, path, callback);
    }

    function pause(path, callback){
        save_route.call(this, rtsp_method.pause, path, callback);
    }

    function teardown(path, callback){
        save_route.call(this, rtsp_method.teardown, path, callback);
    }

    rtsp_router.prototype.setup_routes = function(stream_path, server){

        describe.call(this, stream_path, function (req, res){
            console.log('Sending: '+res.toString());
            //log response being sent
            server.send(req.session, res);
        });
        announce.call(this, stream_path, function (req, res) {
            console.log('Sending: '+res.toString());
            server.send(req.session, res);
        });

        /*
        FFmpeg setup
         */
        let setupUdpComm = function(req, stream_ch){
            let curr_sdp_session = sdp_session.sdp_sessions[stream_path];
            let ip_origin = curr_sdp_session.sdp_session_description.o.split(' ')[5];
            let curr_rtsp_session = server.rtsp_sessions[req.session];
            let rtp_port = -1;
            let rtcp_port = -1;
            if(stream_ch === 0){
                rtp_port = curr_rtsp_session.client_port_rtp_stream0;
                rtcp_port = curr_rtsp_session.client_port_rtcp_stream0;
            }
            else if(stream_ch === 1){
                rtp_port = curr_rtsp_session.client_port_rtp_stream1;
                rtcp_port = curr_rtsp_session.client_port_rtcp_stream1;
            }
            server.stream_track[stream_path+'/streamid='+stream_ch] = new stream_track(ip_origin, rtp_port, rtcp_port, -1);
            server.write_to_stream[ip_origin+'-'+rtp_port+'/rtp'] = [];
            server.write_to_stream[ip_origin+'-'+rtcp_port+'/rtcp'] = [];
        }
        let setupTcpComm = function(req, stream_ch){
            let curr_sdp_session = sdp_session.sdp_sessions[stream_path];
            let ip_origin = curr_sdp_session.sdp_session_description.o.split(' ')[5];
            let tcp_port = server.tcp_connections[req.session].remotePort;
            server.stream_track[stream_path+'/streamid='+stream_ch] = new stream_track(ip_origin, -1, -1, tcp_port);
            if(server.write_to_stream[ip_origin+'-'+tcp_port+'-'+'/interleaved'] === undefined)
                server.write_to_stream[ip_origin+'-'+tcp_port+'-'+'/interleaved'] = [];
        }
        setup.call(this, stream_path+'/streamid=0', function (req, res) {
            console.log('Sending: '+res.toString());
            if(req.transport_rtsp_mode_play_record === 'record') {
                if(req.transport_interleaved !== ''){
                    setupTcpComm(req, 0);
                }
                else {
                    setupUdpComm(req, 0);
                }
            }
            server.send(req.session, res);
        });
        setup.call(this, stream_path+'/streamid=1', function (req, res) {
            console.log('Sending: '+res.toString());
            if(req.transport_rtsp_mode_play_record === 'record') {
                if(req.transport_interleaved !== ''){
                    setupTcpComm(req, 1);
                }
                else {
                    setupUdpComm(req, 1);
                }
            }
            server.send(req.session, res);
        });

        record.call(this, stream_path, function (req, res) {
            console.log('Sending: '+res.toString());
            server.rtsp_sessions[req.session].session_state = rtsp_states.RECORD;
            server.send(req.session, res);
        })

        play.call(this, stream_path, function (req, res) {
            console.log('Sending: '+res.toString());
            server.rtsp_sessions[req.session].session_state = rtsp_states.PLAY;
            server.play_stream(stream_path, req.session);
            server.send(req.session, res);
        });

        pause.call(this, stream_path, function (req, res) {
            console.log('Sending: '+res.toString());
            server.rtsp_sessions[req.session].session_state = rtsp_states.PAUSE;
            server.pause_stream(stream_path, req.session);
            server.send(req.session, res);
        });

        teardown.call(this, stream_path, function (req, res) {
            console.log('Sending: '+res.toString());
            //server.rtsp_sessions[req.session].session_state = rtsp_states.TEARDOWN;
            server.send(req.session, res);
            server.teardown_stream(stream_path, req.session);
        })
    }

    return rtsp_router;
})();

module.exports = rtsp_router;