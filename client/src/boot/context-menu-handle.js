// src/boot/context-menu-handler.js

export default () => {
  window.oncontextmenu = function(event) {
    const pointerEvent = event;
    if (pointerEvent.pointerType === 'touch') {
      // Context menu was triggered by a long-press
      event.preventDefault();
    } else if (pointerEvent.pointerType === 'mouse') {
      // Context menu was triggered by a right-click
      // You can choose to prevent this as well if needed
      // event.preventDefault();
    }
  };
};
