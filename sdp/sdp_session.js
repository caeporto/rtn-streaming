const Buffer = require('buffer');

let sdp_session_description = (function (){

    function sdp_session_description() {
        //Session description
        this.v=undefined; //(protocol version)
        this.o=undefined;  //(originator and session identifier)
        this.s=undefined;  //(session name)
        this.i=undefined; //(session information)
        this.u=undefined; //(URI of description)
        this.e=undefined; //(email address)
        this.p=undefined; //(phone number)
        this.c=undefined; //(connection information -- not required if included in
        //all media descriptions)
        this.b=[]; //(zero or more bandwidth information lines)
        //One or more time descriptions:
        //("t=", "r=" and "z=" lines; see below)
        this.a=[]; //(zero or more session attribute lines)
        //Zero or more media descriptions
    }

    sdp_session_description.prototype.session_to_string = function(){
        let s = '';

        if(this.v !== undefined) s += 'v='+this.v+'\r\n';
        if(this.o !== undefined) s += 'o='+this.o+'\r\n';
        if(this.s !== undefined) s += 's='+this.s+'\r\n';
        if(this.i !== undefined) s += 'i='+this.i+'\r\n';
        if(this.u !== undefined) s += 'u='+this.u+'\r\n';
        if(this.e !== undefined) s += 'e='+this.e+'\r\n';
        if(this.p !== undefined) s += 'p='+this.p+'\r\n';
        if(this.c !== undefined) s += 'c='+this.c+'\r\n';
        this.b.forEach((attribute) =>{
            s += 'b='+attribute+'\r\n';
        });
        this.a.forEach((attribute) =>{
            s += 'a='+attribute+'\r\n';
        });

        return s;
    }

    sdp_session_description.session_attributes = {v: 'v', o: 'o', s: 's', i: 'i', u: 'u', e: 'e', p: 'p', c: 'c', b: 'b', a: 'a'};

    return sdp_session_description;
})();

let sdp_time_description = (function (){

    function sdp_time_description() {
        //Time description
        this.t=undefined; //(time the session is active)
        this.r=[]; //(zero or more repeat times)
        this.z=undefined; //(optional time zone offset line)
    }

    sdp_time_description.prototype.time_to_string = function(){
        let s = '';

        if(this.t !== undefined) s += 't='+this.t+'\r\n';
        this.r.forEach((attribute) =>{
            s += 'r='+attribute+'\r\n';
        });
        if(this.z !== undefined) s += 'z='+this.z+'\r\n';

        return s;
    }

    sdp_time_description.time_attributes = {t: 't', r: 'r', z: 'z'};

    return sdp_time_description;
})();

let sdp_media_description = (function (){

    function sdp_media_description() {
        //Media description, if present
        this.m=undefined; //(media name and transport address)
        this.i=undefined; //(media title)
        this.c=undefined; //(connection information -- optional if included at session level)
        this.b=[]; //(zero or more bandwidth information lines)
        this.a=[]; //(zero or more media attribute lines)
    }

    sdp_media_description.prototype.media_to_string = function(){
        let s = '';

        if(this.m !== undefined) s += 'm='+this.m+'\r\n';
        if(this.i !== undefined) s += 'i='+this.i+'\r\n';
        if(this.c !== undefined) s += 'c='+this.c+'\r\n';
        this.b.forEach((attribute) =>{
            s += 'b='+attribute+'\r\n';
        });
        this.a.forEach((attribute) =>{
            s += 'a='+attribute+'\r\n';
        });

        return s;
    }

    sdp_media_description.media_attributes = {m: 'm', i: 'i', c: 'c', b: 'b', a: 'a'};

    return sdp_media_description;
})();

let sdp_session = (function (){

    sdp_session.sdp_sessions = [];

    function sdp_session(sdp_session_description, sdp_time_description, sdp_media_description0, sdp_media_description1) {
        this.sdp_session_description = sdp_session_description;
        this.sdp_time_description = sdp_time_description;
        this.sdp_media_description_0 = sdp_media_description0;
        this.sdp_media_description_1 = sdp_media_description1;
    }

    function parse_media_description(attribute, value, media_description){
        switch (attribute) {
            case sdp_media_description.media_attributes.m:
                media_description.m = value;
                break;
            case sdp_media_description.media_attributes.i:
                media_description.i = value;
                break;
            case sdp_media_description.media_attributes.c:
                media_description.c = value;
                break;
            case sdp_media_description.media_attributes.b:
                media_description.b.push(value);
                break;
            case sdp_media_description.media_attributes.a:
                media_description.a.push(value);
                break;
            default:
                throw new Error('Invalid SDP Attribute');
        }

        return media_description;
    }

    function parse_time_description(attribute, value, time_description){
        switch (attribute) {
            case sdp_time_description.time_attributes.t:
                time_description.t = value;
                break;
            case sdp_time_description.time_attributes.r:
                time_description.r.push(value);
                break;
            case sdp_time_description.time_attributes.z:
                time_description.z = value;
                break;
            default:
                throw new Error('Invalid SDP Attribute');
        }

        return time_description;
    }

    function parse_session_description(attribute, value, session_description){
        switch (attribute) {
            case sdp_session_description.session_attributes.v:
                session_description.v = value;
                break;
            case sdp_session_description.session_attributes.o:
                session_description.o = value;
                break;
            case sdp_session_description.session_attributes.s:
                session_description.s= value;
                break;
            case sdp_session_description.session_attributes.i:
                session_description.i = value;
                break;
            case sdp_session_description.session_attributes.u:
                session_description.u = value;
                break;
            case sdp_session_description.session_attributes.e:
                session_description.e = value;
                break;
            case sdp_session_description.session_attributes.p:
                session_description.p = value;
                break;
            case sdp_session_description.session_attributes.c:
                session_description.c = value;
                break;
            case sdp_session_description.session_attributes.b:
                session_description.b.push(value);
                break;
            case sdp_session_description.session_attributes.a:
                session_description.a.push(value);
                break;
            default:
                throw new Error('Invalid SDP Attribute');
        }

        return session_description;
    }

    sdp_session.parse_sdp_session = function (data) {
        let session = new sdp_session();
        let session_description = new sdp_session_description();
        let time_description = new sdp_time_description();
        let media_description_0 = new sdp_media_description();
        let media_description_1 = new sdp_media_description();
        let streamMedia = 0;
        let sessionState = 0;
        for(let line = 0; line < data.length; line++){
            let sdp_line = data[line].split(/=(.+)/);
            if(sdp_line[0] === '')
                break;
            let attribute = sdp_line[0];
            if(attribute === 'm') streamMedia++;
            let value = sdp_line[1];
            if(sessionState === 0) {
                if(session_description.hasOwnProperty(attribute)) {
                    session_description = parse_session_description(attribute, value, session_description)
                    continue;
                }
                else sessionState = 1;
            }
            if(sessionState === 1){
                if(time_description.hasOwnProperty(attribute)) {
                    time_description = parse_time_description(attribute, value, time_description);
                    continue;
                }
                else sessionState = 2;
            }
            if(sessionState === 2) {
                if(media_description_0.hasOwnProperty(attribute)) {
                    if(streamMedia === 2){
                        media_description_1 = parse_media_description(attribute, value, media_description_1);
                    }
                    else {
                        media_description_0 = parse_media_description(attribute, value, media_description_0);
                    }
                    continue;
                }
                else throw new Error('SDP Attribute is Invalid!');
            }
        }

        session.sdp_session_description = session_description;
        session.sdp_time_description = time_description;
        session.sdp_media_description_0 = media_description_0;
        session.sdp_media_description_1 = media_description_1;

        return session;
    }

    sdp_session.prototype.sdp_to_string = function(){
        let s = '';

        s += this.sdp_session_description.session_to_string();
        s += this.sdp_time_description.time_to_string();
        s += this.sdp_media_description_0.media_to_string();
        s += this.sdp_media_description_1.media_to_string();

        return s;
    }

    sdp_session.sdp_to_buffer = function(sdp_string){
        return Buffer.Buffer.from(sdp_string);
    }

    return sdp_session;
})();

module.exports = sdp_session;