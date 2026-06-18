import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const LINE_SOURCE = 'guess-line';
const LINE_LAYER  = 'guess-line-layer';

export default function Globe({ onGuess, guessLatLng, correctLatLng, disabled }) {
  const containerRef    = useRef();
  const mapRef          = useRef(null);
  const onGuessRef      = useRef(onGuess);
  const disabledRef     = useRef(disabled);
  const guessMarkerRef  = useRef(null);
  const correctMarkerRef = useRef(null);

  useEffect(() => { onGuessRef.current = onGuess; }, [onGuess]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  // Initialize map once
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
      center: [-119.4, 36.7],
      zoom: 3.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      map.setFog({
        color: 'rgb(13, 26, 58)',
        'high-color': 'rgb(29, 158, 117)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(10, 20, 50)',
        'star-intensity': 0.6,
      });

      map.addSource(LINE_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: LINE_SOURCE,
        paint: {
          'line-color': 'rgba(255,255,255,0.55)',
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      });
    });

    map.on('click', (e) => {
      if (!disabledRef.current) {
        onGuessRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cursor
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = disabled ? 'default' : 'crosshair';
  }, [disabled]);

  // Guess marker (white dot)
  useEffect(() => {
    guessMarkerRef.current?.remove();
    guessMarkerRef.current = null;
    const map = mapRef.current;
    if (!map || !guessLatLng) return;

    const el = document.createElement('div');
    el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#ffffff;border:2px solid rgba(0,0,0,0.5);box-shadow:0 0 0 3px rgba(255,255,255,0.25)';
    guessMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([guessLatLng.lng, guessLatLng.lat])
      .addTo(map);
  }, [guessLatLng]);

  // Correct location marker (teal dot)
  useEffect(() => {
    correctMarkerRef.current?.remove();
    correctMarkerRef.current = null;
    const map = mapRef.current;
    if (!map || !correctLatLng) return;

    const el = document.createElement('div');
    el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#1D9E75;border:2px solid rgba(0,0,0,0.5);box-shadow:0 0 0 4px rgba(29,158,117,0.35)';
    correctMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([correctLatLng.lng, correctLatLng.lat])
      .addTo(map);
  }, [correctLatLng]);

  // Dashed line between guess and correct
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(LINE_SOURCE);
    if (!source) return;

    if (guessLatLng && correctLatLng) {
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [guessLatLng.lng, guessLatLng.lat],
            [correctLatLng.lng, correctLatLng.lat],
          ],
        },
      });
    } else {
      source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
    }
  }, [guessLatLng, correctLatLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
