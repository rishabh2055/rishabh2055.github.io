import { Component } from '@angular/core';
import { AngularAgoraRtcService, Stream } from 'angular-agora-rtc';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'video-calling-app';
  localStream: Stream;
  remoteCalls:any = [];
  constructor(
    private agoraService: AngularAgoraRtcService
  ){
    /*
      Create the broadcast client object.
      The broadcast client object can only be created once per call session.
     */
    this.agoraService.createClient();
  }

  // Method used to call when user clicks on start call button
  startCall() {
    /*
      User can now join the session by calling this method.
      Passing the channel key, channel name, and user ID to the method parameters
    */
    this.agoraService.client.join(null, '1000', null, (uid) => {
      /*
        We can then use that to create the stream using the.createStream()
        method and passing the uid as well as other optional parameters.
      */
      this.localStream = this.agoraService.createStream(uid, true, null, null, true, false);
      /*
        We then set the stream video profile to 720p_3 and call the method subscribeToStreams() ,
        which we will look at below.
      */
      this.localStream.setVideoProfile('720p_3');
      // Subscribing to the Stream
      this.subscribeToStreams();
    });
  }

  // Method used to subscribe new video stream
  private subscribeToStreams() {
    /*
      The first thing we are doing is adding event listeners using the localStream.on()
      method to check for the user's microphone and camera permissions.
    */
    this.localStream.on("accessAllowed", () => {
      console.log("accessAllowed");
    });
    // The user has denied access to the camera and mic.
    this.localStream.on("accessDenied", () => {
      console.log("accessDenied");
    });

    /*
      Next, the app initializes the stream by calling the localStream.init() method.
    */
    this.localStream.init(() => {
      console.log("getUserMedia successfully");
      /*
        This method is going to look for an HTML element with the id of agora_local and render the local video stream.
      */
      this.localStream.play('agora_local');
      /*
        Once initialized, the stream's host publishes the stream using the client.publish() method,
        The publish method takes the local stream as a parameter.
      */
      this.agoraService.client.publish(this.localStream, function (err) {
        console.log("Publish local stream error: " + err);
      });
      this.agoraService.client.on('stream-published', function (evt) {
        console.log("Publish local stream successfully");
      });
    }, function (err) {
      console.log("getUserMedia failed", err);
    });

    // Adding event listener
    this.agoraService.client.on('error', (err) => {
      console.log("Got error msg:", err.reason);
      if (err.reason === 'DYNAMIC_KEY_TIMEOUT') {
        this.agoraService.client.renewChannelKey("", () => {
          console.log("Renew channel key successfully");
        }, (err) => {
          console.log("Renew channel key failed: ", err);
        });
      }
    });

    // Adding event listener
    this.agoraService.client.on('stream-added', (evt) => {
      const stream = evt.stream;
      this.agoraService.client.subscribe(stream, (err) => {
        console.log("Subscribe stream failed", err);
      });
    });

    // Adding event listener
    this.agoraService.client.on('stream-subscribed', (evt) => {
      const stream = evt.stream;
      if (!this.remoteCalls.includes(`agora_remote${stream.getId()}`)) this.remoteCalls.push(`agora_remote${stream.getId()}`);
      setTimeout(() => stream.play(`agora_remote${stream.getId()}`), 2000);
    });

    // Adding event listener
    this.agoraService.client.on('stream-removed', (evt) => {
      const stream = evt.stream;
      stream.stop();
      this.remoteCalls = this.remoteCalls.filter(call => call !== `#agora_remote${stream.getId()}`);
      console.log(`Remote stream is removed ${stream.getId()}`);
    });

    // Adding event listener
    this.agoraService.client.on('peer-leave', (evt) => {
      const stream = evt.stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call === `#agora_remote${stream.getId()}`);
        console.log(`${evt.uid} left from this channel`);
      }
    });

  }
}
