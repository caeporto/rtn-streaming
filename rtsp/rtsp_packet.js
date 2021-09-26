const Buffer = require('buffer');
const { rtsp_method, server_name, media_content_type } = require('../util/rtsp_options');
const rtsp_resp_status = require('./rtsp_resp_status');
const rtsp_headers = require('./rtsp_headers');
const sdp_session = require('../sdp/sdp_session');

const break_line = '\r\n';
let rtsp_packet = (function (){

    function rtsp_packet() {
        this.method = '';
        this.url = '';
        this.protocol = '';
        this.cseq = -1;
        this.user_agent = '';
        this.content_length = '';
        this.session = '';
        this.ssrc = '';
        this.transport_protocol_tcp_udp = '';
        this.transport_mode_unicast_multicast = '';
        this.transport_client_ports = '';
        this.transport_server_ports = '';
        this.transport_rtsp_mode_play_record = '';
        this.transport_interleaved = '';
        this.record_range = '';
    }

    rtsp_packet.prototype.mount_response_packet = function (){
        switch (this.method){
            case rtsp_method.options:
                return mount_options_packet.call(this);
            case rtsp_method.announce:
                return mount_announce_packet.call(this);
            case rtsp_method.setup:
                return mount_setup_packet.call(this);
            case rtsp_method.record:
                return mount_record_packet.call(this);
            case rtsp_method.teardown:
                return mount_teardown_packet.call(this);
            case rtsp_method.describe:
                return mount_describe_packet.call(this);
            case rtsp_method.play:
                return mount_play_packet.call(this);
            case rtsp_method.pause:
                return mount_pause_packet.call(this);
        }
    }

    function mount_options_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            mount_public_options_packet()+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_announce_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            mount_session_packet.call(this)+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_setup_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            mount_session_packet.call(this)+break_line+
            mount_transport_packet.call(this)+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_record_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            mount_session_packet.call(this)+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_teardown_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_describe_packet(){
        let sdpSessionString = sdp_session.sdp_sessions[this.url].sdp_to_string();
        let sdpSessionBuffer = sdp_session.sdp_to_buffer(sdpSessionString);
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            mount_content_type_packet()+break_line+
            mount_content_length_packet(sdpSessionBuffer)+break_line+break_line+
            sdpSessionString;
        return Buffer.Buffer.from(packet);
    }

    function mount_play_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_pause_packet(){
        let packet =
            mount_ok_packet.call(this)+break_line+
            mount_c_seq_packet.call(this)+break_line+
            mount_server_name_packet()+break_line+
            break_line;
        return Buffer.Buffer.from(packet);
    }

    function mount_transport_packet(){
        let interleavedTcpOrUdp = (this.transport_interleaved !== '')?
            'interleaved='+this.transport_interleaved :
            ('client_port='+this.transport_client_ports+';'+'server_port='+this.transport_server_ports);
        let modePlayOrRecord = (this.transport_rtsp_mode_play_record !== '')? ';mode='+this.transport_rtsp_mode_play_record : ''

        return rtsp_headers.Transport+': '+
            this.transport_protocol_tcp_udp+';'+
            this.transport_mode_unicast_multicast+';'+
            interleavedTcpOrUdp+';'+
            'ssrc='+this.ssrc+
            modePlayOrRecord;
    }

    function mount_content_length_packet(contentBuffer){
        return rtsp_headers.ContentLength+': '+contentBuffer.length;
    }

    function mount_content_type_packet(){
        return rtsp_headers.ContentType+': '+media_content_type;
    }

    function mount_session_packet(){
        return rtsp_headers.Session+': '+this.session;
    }

    function mount_ok_packet(){
        return this.protocol+' '+rtsp_resp_status.OK+' OK';
    }

    function mount_c_seq_packet(){
        return rtsp_headers.CSeq+': '+this.cseq;
    }

    function mount_server_name_packet(){
        return rtsp_headers.Server+': '+server_name;
    }

    function mount_public_options_packet(){
        return rtsp_headers.Public+': '+rtsp_method.public_options.join(', ');
    }

    return rtsp_packet;
})();

module.exports = rtsp_packet;