module.exports = {
    server_name: 'Node.js RTSP Server',
    server_protocol: 'RTSP/1.0',
    communication_mode: 'unicast',
    content_type: {
        media: 'application/sdp',
        parameters: 'text/parameters'
    },
    rtsp_method: {
        options: 'OPTIONS',
        describe: 'DESCRIBE',
        announce: 'ANNOUNCE',
        pause: 'PAUSE',
        play: 'PLAY',
        setup: 'SETUP',
        record: 'RECORD',
        teardown: 'TEARDOWN',
        public_options: ['DESCRIBE',
            'ANNOUNCE',
            'PAUSE',
            'PLAY',
            'SETUP',
            'RECORD',
            'TEARDOWN']
    },
    server_info: function (server_handle) {
        let address = server_handle.address();
        let port = address.port;
        let family = address.family;
        let ipaddr = address.address;
        console.log('Server is listening at port ' + port);
        console.log('Server ip :' + ipaddr);
        console.log('Server is IP4/IP6 : ' + family);
    }
};