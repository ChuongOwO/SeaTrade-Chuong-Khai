import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * LeafletMap: Bản đồ OSM hoàn chỉnh dùng Leaflet.js bên trong WebView (CDN).
 *
 * Props:
 *  - initialRegion: { latitude, longitude, latitudeDelta, longitudeDelta }
 *  - markers: [{ id, lat, lng, type: 'me'|'fisherman'|'trader'|'virtual', title }]
 *  - polyline: [{ latitude, longitude }]
 *  - onPress: () => void
 *  - style: ViewStyle
 *
 * Ref methods:
 *  - animateToRegion({ latitude, longitude, latitudeDelta })
 */
const LeafletMap = forwardRef(function LeafletMap(
  { initialRegion, markers = [], polyline = null, onPress, onMarkerPress, style },
  ref
) {
  const webviewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    animateToRegion({ latitude, longitude, latitudeDelta }) {
      const zoom = latDeltaToZoom(latitudeDelta);
      webviewRef.current?.injectJavaScript(
        `window._map && window._map.setView([${latitude}, ${longitude}], ${zoom}); true;`
      );
    },
  }));

  useEffect(() => {
    const markersJson = JSON.stringify(markers);
    const polylineJson = polyline ? JSON.stringify(polyline) : 'null';
    webviewRef.current?.injectJavaScript(`
      if (window._updateMap) window._updateMap(${markersJson}, ${polylineJson});
      true;
    `);
  }, [markers, polyline]);

  const lat = initialRegion?.latitude ?? 10.324;
  const lng = initialRegion?.longitude ?? 107.124;
  const zoom = latDeltaToZoom(initialRegion?.latitudeDelta ?? 0.1);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: buildHtml(lat, lng, zoom) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        // Chặn WebView navigate ra ngoài khi bấm link attribution
        onShouldStartLoadWithRequest={(request) => {
          // Chỉ cho phép trang "about:blank" hoặc "data:" (trang HTML nội bộ)
          return request.url.startsWith('about:') || request.url.startsWith('data:');
        }}
        onMessage={(e) => {
          const msg = e.nativeEvent.data;
          if (msg === 'MAP_PRESS' && onPress) onPress();
          if (msg.startsWith('MARKER_') && onMarkerPress) {
            onMarkerPress(msg.replace('MARKER_', ''));
          }
        }}
        scrollEnabled={false}
      />
    </View>
  );
});

export default LeafletMap;

function latDeltaToZoom(latDelta) {
  if (!latDelta || latDelta <= 0) return 12;
  return Math.min(19, Math.max(1, Math.round(Math.log2(360 / latDelta)) - 1));
}

function buildHtml(lat, lng, zoom) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html, body, #map { width:100%; height:100%; margin:0; padding:0; overflow:hidden; }
  .dot { width:18px; height:18px; border-radius:50%; border:3px solid #fff;
         box-shadow:0 2px 6px rgba(0,0,0,0.45); box-sizing:border-box; }
  .dot-me        { background:#0ea5e9; }
  .dot-fisherman { background:#0ea5e9; }
  .dot-trader    { background:#f59e0b; }
  .dot-virtual   { background:#e11d48; }
  .leaflet-control-attribution { font-size:10px; pointer-events:none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], ${zoom});
window._map = map;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

map.on('click', function() {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MAP_PRESS');
});

var _markers = {};
var _polyline = null;

function makeIcon(type) {
  return L.divIcon({
    className: 'dot dot-' + (type || 'me'),
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

window._updateMap = function(markersArr, polylineArr) {
  var ids = {};
  (markersArr || []).forEach(function(m) {
    ids[m.id] = true;
    if (_markers[m.id]) {
      _markers[m.id].setLatLng([m.lat, m.lng]);
    } else {
      var mk = L.marker([m.lat, m.lng], { icon: makeIcon(m.type) }).addTo(map);
      if (m.title) mk.bindTooltip(m.title, { permanent: false });
      // Click marker → gửi ID về React Native (chỉ với tàu khác, không phải vị trí của mình)
      if (m.id !== 'me') {
        mk.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MARKER_' + m.id);
        });
      }
      _markers[m.id] = mk;
    }
  });
  Object.keys(_markers).forEach(function(id) {
    if (!ids[id]) { map.removeLayer(_markers[id]); delete _markers[id]; }
  });

  if (_polyline) { map.removeLayer(_polyline); _polyline = null; }
  if (polylineArr && polylineArr.length >= 2) {
    _polyline = L.polyline(
      polylineArr.map(function(p) { return [p.latitude, p.longitude]; }),
      { color: '#0ea5e9', weight: 3, dashArray: '8 6' }
    ).addTo(map);
  }
};
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#e8f4f8' },
});
