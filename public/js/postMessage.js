/**
 * Self executing function encapsulating postMessage.child functions
 */

var _postMessage = _postMessage ||  (function(){
  'use strict';

  //We can generically add a listener to receive message
  window.addEventListener('message', function(e) {
    if (e.origin !== window.location.origin) {
      return;
    }
    _postMessage.receive(e);
  });

  return {
    listen: false,
    isParent: false,
    receiveCallback: null,
    post: function(msgObj, target) {
      if (!this.listen) {
        return;
      }
      if (target === undefined) {
        target = window.parent;
      }
      target.postMessage(msgObj,'*');
    },
    receive: function(e) {
      if (!this.listen) {
        return;
      }
      var data = e.data;
      if (this.isParent) {
        var targetId = e.data.targetId;
        if (targetId === 'parent') {
          if (this.receiveCallback) {
            this.receiveCallback(data);
          } else {
            console.log('postMessage parent callback not defined');
            return;
          }
        } else {
          var target = this.getTargetById(targetId);
          if (target !== undefined) {
            this.post(data, target);
          } else {
            console.log('postMessage target not found');
            return;
          }
        }
      } else {
        if (this.receiveCallback) {
          this.receiveCallback(data);
        }
      }
    },
    initPostMessageBridge: function() {
      this.listen = true;
      this.isParent = true;
    },
    removePostMessageBridge: function() {
      this.listen = false;
      this.isParent = false;
    },
    getTargetById: function(targetId) {
      var target = null;
      for (var i = 0; i < window.frames.length; i++) {
        if (window.frames[i].frameElement.id === targetId) {
          target = window.frames[i];
        }
      }
      return target;
    }
  };
})();