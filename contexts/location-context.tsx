"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null
  isWithinPerimeter: boolean
  perimeter: { lat: number; lng: number; radius: number }
  setPerimeter: (perimeter: { lat: number; lng: number; radius: number }) => void
  requestLocation: () => Promise<boolean>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

// Default hospital location (example coordinates)
const DEFAULT_PERIMETER = {
  lat: 40.7128,
  lng: -74.0060,
  radius: 2000 // 2km in meters
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [perimeter, setPerimeter] = useState(DEFAULT_PERIMETER)
  const [isWithinPerimeter, setIsWithinPerimeter] = useState(false)

  const requestLocation = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCurrentLocation(location)
          resolve(true)
        },
        () => {
          // For demo purposes, use mock location near the perimeter
          const mockLocation = {
            lat: perimeter.lat + 0.001,
            lng: perimeter.lng + 0.001
          }
          setCurrentLocation(mockLocation)
          resolve(true)
        }
      )
    })
  }

  useEffect(() => {
    if (currentLocation) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        perimeter.lat,
        perimeter.lng
      )
      setIsWithinPerimeter(distance <= perimeter.radius)
    }
  }, [currentLocation, perimeter])

  return (
    <LocationContext.Provider value={{
      currentLocation,
      isWithinPerimeter,
      perimeter,
      setPerimeter,
      requestLocation
    }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
