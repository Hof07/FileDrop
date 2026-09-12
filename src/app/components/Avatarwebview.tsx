import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// NOTE: @bible-strong/avatar-react is a web-only React-DOM component (renders raw
// <svg>/<path> tags), so it cannot run directly inside React Native. This wraps it
// in a WebView that loads a small standalone HTML page, which pulls React + the
// avatar library from a CDN (esm.sh) and renders the avatar there. We then talk to
// it over postMessage to change the animation state without reloading the page.
//
// IMPORTANT: this requires @bible-strong/avatar-react to be published on npm in a
// way esm.sh can resolve (a browser-compatible ESM build). If it isn't, you'll need
// to host your own built bundle (e.g. via a small Vite build) and point `source`
// at that URL or a local HTML asset instead of the inline `html` below.

interface AvatarWebViewProps {
  animation: string;
  definition: unknown; // pass your avatar.avatar.json contents in as-is
  style?: object;
}

function buildHtml(definitionJson: string, initialAnimation: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }
      #root {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* The avatar lib renders raw <svg>; force it to fill and preserve
         aspect ratio instead of clipping to the container's top-left. */
      #root svg {
        width: 200% !important;
        height: 200% !important;
        max-width: 100%;
        max-height: 100%;
        display: block;
      }
    </style>
  </head>
  <body>
    
      <div id="root"></div>
    
    <script type="module">
      import React from 'https://esm.sh/react@18';
      import { createRoot } from 'https://esm.sh/react-dom@18/client';
      import { createAvatar } from 'https://esm.sh/@bible-strong/avatar-react@latest?deps=react@18,react-dom@18';

      const definition = ${definitionJson};
      const Avatar = createAvatar(definition);
      const root = createRoot(document.getElementById('root'));

      let currentAnimation = ${JSON.stringify(initialAnimation)};

      function render() {
        root.render(React.createElement(Avatar, { defaultAnimation: currentAnimation }));
      }
      render();

      // Listen for animation updates sent from React Native via postMessage.
      document.addEventListener('message', handleMessage); // Android
      window.addEventListener('message', handleMessage);   // iOS

      function handleMessage(event) {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'SET_ANIMATION' && typeof data.animation === 'string') {
            currentAnimation = data.animation;
            render();
          }
        } catch (e) {
          // ignore malformed messages
        }
      }
    </script>
  </body>
</html>`;
}

export function AvatarWebView({ animation, definition, style }: AvatarWebViewProps) {
  const webviewRef = useRef<WebView>(null);

  // Build the HTML once (definition shouldn't change at runtime); animation
  // updates are pushed via postMessage instead of reloading the WebView.
  const html = useMemo(
    () => buildHtml(JSON.stringify(definition), animation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [definition],
  );

  useEffect(() => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'SET_ANIMATION', animation }));
  }, [animation]);

  // NOTE: if your project's react-native-webview / @types/react versions are
  // mismatched, TS can misresolve WebView's prop overloads down to `never`,
  // rejecting every prop below with unrelated-looking errors. `WebViewAny`
  // sidesteps that broken inference. Prefer fixing the version mismatch
  // (see npm ls react-native-webview / npm ls @types/react, then dedupe)
  // over relying on this cast long-term.
  const WebViewAny = WebView as unknown as React.ComponentType<any>;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <WebViewAny
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        backgroundColor="transparent"
        javaScriptEnabled
        // Android needs this for transparent background to actually show through.
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AvatarWebView;