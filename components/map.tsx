"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, Autocomplete, Circle } from "@react-google-maps/api";
import { Button, InputNumber } from "antd";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 20.5937, // India center
  lng: 78.9629,
};

interface MapSelectorProps {
  initialLat?: number;
  initialLng?: number;
  radius?: number; // in kilometers
  onLocationChange?: (lat: number, lng: number, radiusKm: number) => void;
}

export default function MapSelector({
  initialLat,
  initialLng,
  radius, 
  onLocationChange
}: MapSelectorProps) {


  console.log(initialLat , initialLng , radius)

  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [mapCenter, setMapCenter] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultCenter
  );
  const [radiusKm, setRadiusKm] = useState(radius);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Update when parent changes
  useEffect(() => {
    if (initialLat && initialLng) {
      setMapCenter({ lat: initialLat, lng: initialLng });
      setSelectedPosition({ lat: initialLat, lng: initialLng });
    }
    setRadiusKm(radius);
  }, [initialLat, initialLng, radius]);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setSelectedPosition({ lat, lng });
        setMapCenter({ lat, lng });
        onLocationChange?.(lat, lng, radiusKm!);
      }
    },
    [onLocationChange, radiusKm]
  );

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handleSearchClick = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setSelectedPosition({ lat, lng });
        onLocationChange?.(lat, lng, radiusKm!);
      }
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}
      libraries={["places"]}
    >
      <div style={{ marginBottom: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
        <Autocomplete onLoad={onLoadAutocomplete}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search a location"
            style={{
              width: "300px",
              height: "40px",
              padding: "8px",
              fontSize: "16px",
            }}
          />
        </Autocomplete>
        <Button type="primary" onClick={handleSearchClick}>
          Search
        </Button>

        
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={selectedPosition ? 14 : 5}
        onClick={handleMapClick}
      >
        {selectedPosition && (
          <>
            <Marker position={selectedPosition} />
            <Circle
              center={selectedPosition}
              radius={radiusKm!} 
              options={{
                fillColor: "blue",
                fillOpacity: 0.2,
                strokeColor: "#1976d2",
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          </>
        )}
      </GoogleMap>
    </LoadScript>
  );
}
