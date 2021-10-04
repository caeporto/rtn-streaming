const rtsp_packet = require('./rtsp_packet');
const { rtsp_method, content_type, server_protocol, communication_mode } = require('../util/rtsp_options');
const sdp_session = require('../sdp/sdp_session');
const rtsp_headers = require('./rtsp_headers');
const rtsp_states = require('./rtsp_states');

let rtsp_session = (function (){

    function rtsp_session(rtp_port, rtcp_port, session_id, ssrc){
        this.session_id = session_id;
        this.ssrc = ssrc;
        this.cseq = -1;
        this.stream_path = '';
        this.session_state = rtsp_states.SETUP;
        this.setup_stream_interleaved = false;
        this.read_stream_interleaved = {'stream_interleaved': false, 'next_index': 0};
        this.sdp_read_flag = false;
        this.save_prev_packet = null;
        /** server ports for RTP and RTCP communication */
        this.server_port_rtp_stream = rtp_port;
        this.server_port_rtcp_stream = rtcp_port;
        /** client ports for RTP and RTCP communication */
        this.client_port_rtp_stream0 = -1;
        this.client_port_rtcp_stream0 = -1;
        this.client_port_rtp_stream1 = -1;
        this.client_port_rtcp_stream1 = -1;
    }

    function map_headers_values(data_tokens){
        let headers = [];
        let values = [];
        let ret = 0;
        let finalIndex = 0;

        for(let tokenIndex = 0; tokenIndex < data_tokens.length; tokenIndex++){
            if(data_tokens[tokenIndex] === '') {
                finalIndex = tokenIndex;
                ret = (data_tokens.length-1 === tokenIndex+1)? ret : 1;
                break;
            }
            let header_value = data_tokens[tokenIndex].split(':');
            headers.push(header_value[0]);
            values.push(header_value[1].substring(1));
        }

        return [headers, values, ret, finalIndex];
    }

    function read_headers(data_tokens, rtspPacket){
        let headersValues = map_headers_values(data_tokens);
        let headers = headersValues[0];
        let values = headersValues[1];
        let readRet = headersValues[2];
        let readRetIndex = headersValues[3];
        let tokenIndex = 0;

        headers.forEach((token) => {
            switch (token) {
                case rtsp_headers.CSeq:
                    let c_seq_val = parseInt(values[tokenIndex], 10);
                    if(this.cseq === -1)
                        this.cseq = c_seq_val;
                    else if(this.cseq !== c_seq_val)
                        throw Error('Invalid CSeq number received from client');
                    rtspPacket.cseq = this.cseq;
                    break;
                case rtsp_headers.UserAgent:
                    let user_agent = values[tokenIndex];
                    rtspPacket.user_agent = user_agent;
                    break;
                case rtsp_headers.ContentType:
                    let content = values[tokenIndex];
                    if(content !== content_type.media && content !== content_type.parameters)
                        throw Error('Content type must be either SDP or Parameter setting');
                    break;
                case rtsp_headers.ContentLength:
                    let content_length = values[tokenIndex];
                    rtspPacket.content_length = content_length;
                    break;
                case rtsp_headers.Transport:
                    let transport = values[tokenIndex];
                    let transportOptions = transport.split(';');
                    //transportOptions[0] = RTSP over TCP or UDP
                    //transportOptions[1] = Unicast or Multicast
                    //transportOptions[2] = Client ports for stream, RTP and RTCP, or Interleaved
                    //transportOptions[3] = mode = record or play
                    if(transportOptions[1] !== communication_mode)
                        throw new Error('RTSP Communication must be unicast')
                    if(transportOptions[2].startsWith('interleaved')) {
                        this.setup_stream_interleaved = true;
                        let channels = transportOptions[2].split('=')[1].split('-');
                        rtspPacket.transport_interleaved = channels[0]+'-'+channels[1];
                    }
                    else {
                        let client_ports = transportOptions[2].split('=')[1].split('-');
                        let client_rtp_port = client_ports[0];
                        let client_rtcp_port = client_ports[1];
                        if(rtspPacket.url.endsWith("streamid=0")){
                            this.client_port_rtp_stream0=client_rtp_port;
                            this.client_port_rtcp_stream0=client_rtcp_port;
                            rtspPacket.transport_client_ports = this.client_port_rtp_stream0+'-'+this.client_port_rtcp_stream0;
                            rtspPacket.transport_server_ports = this.server_port_rtp_stream+'-'+this.server_port_rtcp_stream;
                        }
                        else{
                            this.client_port_rtp_stream1=client_rtp_port;
                            this.client_port_rtcp_stream1=client_rtcp_port;
                            rtspPacket.transport_client_ports = this.client_port_rtp_stream1+'-'+this.client_port_rtcp_stream1;
                            rtspPacket.transport_server_ports = this.server_port_rtp_stream+'-'+this.server_port_rtcp_stream;
                        }
                    }
                    rtspPacket.transport_protocol_tcp_udp = transportOptions[0];
                    rtspPacket.transport_mode_unicast_multicast = transportOptions[1];
                    rtspPacket.transport_rtsp_mode_play_record = (transportOptions[3] !== undefined)? transportOptions[3].split('=')[1] : '';
                    break;
                case rtsp_headers.Session:
                    let c_session = values[tokenIndex];
                    if(c_session !== this.session_id)
                        throw Error('Different session id received from client');
                    break;
                case rtsp_headers.Range:
                    let c_range = values[tokenIndex];
                    rtspPacket.record_range = c_range;
                    break;
                case rtsp_headers.Accept:
                    let c_accept = values[tokenIndex];
                    if(c_accept !== content_type.media)
                        throw Error('Content type must be SDP');
                    break;
                default:
                    throw new Error("Invalid RTSP Header");
            }
            tokenIndex++;
        });

        return [readRet, readRetIndex];
    }

    function rcv_data(data_tokens, method, url, protocol){
        let rtspPacket = new rtsp_packet();
        rtspPacket.method = method;
        rtspPacket.url = url; //second token url
        rtspPacket.protocol = protocol; //third token protocol
        let readHeaders = read_headers.call(this, data_tokens, rtspPacket);

        if(rtspPacket.method === rtsp_method.describe){
            this.stream_path = rtspPacket.url;
            //process here if there's no sdp session available when receving a describe method
            if(sdp_session.sdp_sessions[this.stream_path] === undefined) {
                throw new Error("SDP Session Not Found");
            }
        }

        let ret = readHeaders[0];
        if(ret){
            //process more things after CRLF
            let retIndex = readHeaders[1]+1;
            if(rtspPacket.method === rtsp_method.announce){
                this.stream_path = rtspPacket.url;
                sdp_session.sdp_sessions[this.stream_path] = sdp_session.parse_sdp_session(data_tokens.slice(retIndex, data_tokens.length));
            }
        }
        else if(!ret && rtspPacket.method === rtsp_method.announce){
            this.sdp_read_flag = true;
        }

        rtspPacket.session = this.session_id;
        rtspPacket.ssrc = this.ssrc;
        this.cseq++;
        this.save_prev_packet = rtspPacket;
        return rtspPacket;
    }

    rtsp_session.prototype.process_rtsp_data = async function(data){
        let all_data = data.toString();
        let tokens = all_data.split(/(?:\r\n|\r|\n)/g);
        let rtsp_header = tokens.shift().split(' ');
        let method = rtsp_header[0]; //first token must be the request method
        let url = rtsp_header[1]; //second token must be the url
        let protocol = rtsp_header[2]; //third token must be the protocol
        if(rtsp_method.public_options.indexOf(method) > -1 || method === rtsp_method.options) {
            if(protocol === server_protocol) {
                return rcv_data.call(this, tokens, method, url, protocol);
            }
            else {
                throw new Error("Protocol not supported, must be RTSP/1.0");
            }
        }
        else {
            throw new Error("RTSP method not supported");
        }
    }

    return rtsp_session;
})();

module.exports = rtsp_session;