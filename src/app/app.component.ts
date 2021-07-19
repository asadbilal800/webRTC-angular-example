import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { io } from 'socket.io-client';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  socketIO;
  roomName;
  myMessage;
  @ViewChild('localvideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;
  mediaStream;
  localPeerConnection;

  iceConfiguration = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  constructor() {}

  ngOnInit() {
    this.localPeerConnection = new RTCPeerConnection(this.iceConfiguration);
    this.registerListener();
    this.mediaStream = new MediaStream();
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        this.localVideo.nativeElement.srcObject = stream;
        this.localPeerConnection.addStream(stream);
        this.remoteVideo.nativeElement.srcObject = this.mediaStream;
      });

    this.socketIO = io('http://192.168.100.6:3000');

    this.socketIO.on('getting-into-room', (id) => {
      this.roomName = id;
      this.socketIO.on(this.roomName, (data) => {
        if (JSON.stringify(this.myMessage) !== JSON.stringify(data)) {
          if (data === 'hello from peer!') {
            this.makeVideoConnection();
          }

          if (data.info === 'ice-candidate') {
            console.log('setting ice candidate.');
            this.localPeerConnection.addIceCandidate(data.msg);
          }

          if (data.info === 'remote-answer') {
            console.log('step 5 setting remote desc for user 2');

            this.localPeerConnection.setRemoteDescription(
              new RTCSessionDescription(data.msg)
            );

            console.log(this.localPeerConnection);
          }

          if (data.info === 'offer') {
            console.log('step 3 setting remote offer for user 2');

            this.localPeerConnection
              .setRemoteDescription(new RTCSessionDescription(data.msg))
              .then(() => {
                this.localPeerConnection.createAnswer().then((ans) => {
                  console.log('step 4 setting local desc for user 2');

                  this.localPeerConnection
                    .setLocalDescription(ans)
                    .then(() => {
                      let data = {
                        msg: ans,
                        roomName: this.roomName,
                        info: 'remote-answer',
                      };

                      this.myMessage = data;
                      this.socketIO.emit('send-msg', data);
                      console.log(this.localPeerConnection);
                    })
                    .catch((err) => {
                      throw err;
                    });
                });
              })
              .catch((err) => {
                throw err;
              });
          }
          //meaning its a remote answer for user 1 from user 2,you must set it.
        } else {
          console.log('my own msg!');
        }
      });
    });
  }

  call() {
    this.socketIO.emit('find-partner', null);
  }

  makeVideoConnection() {
    console.log('initiating video connection.');
    console.log(this.iceConfiguration);

    console.log('step 1 create offer.');
    this.localPeerConnection.createOffer().then((offer) => {
      let dataOffer = {
        type: offer.type,
        sdp: offer.sdp,
      };
      this.localPeerConnection
        .setLocalDescription(dataOffer)
        .then(() => {
          console.log('step 2 setting local');

          //sending offer to remote peer that is in indeed in the same room from the socket io.
          let data = {
            msg: dataOffer,
            roomName: this.roomName,
            info: 'offer',
          };
          this.myMessage = data;
          this.socketIO.emit('send-msg', data);
          console.log('sending remote offer to user 2...');
        })
        .catch((err) => {
          throw err;
        });
    });
  }

  registerListener() {
    this.localPeerConnection.ontrack = (event) => {
      console.log('adding track');
      this.mediaStream = event.streams[0];
      this.remoteVideo.nativeElement.srcObject = this.mediaStream;
    };

    this.localPeerConnection.oniceconnectionstatechange = (event) => {
      console.log('ice connection change');
    };
    this.localPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        let data = {
          msg: event.candidate,
          roomName: this.roomName,
          info: 'ice-candidate',
        };

        this.socketIO.emit('send-msg', data);
      }
    };
  }}
