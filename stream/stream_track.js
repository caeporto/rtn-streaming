let stream_track = (function () {

    function stream_track(ip_origin, rtp_port, rtcp_port, tcp_port){
        this.ip_origin = ip_origin;
        this.rtp_port = rtp_port;
        this.rtcp_port = rtcp_port;
        this.tcp_port = tcp_port;
    }

    return stream_track;
})();

module.exports = stream_track;