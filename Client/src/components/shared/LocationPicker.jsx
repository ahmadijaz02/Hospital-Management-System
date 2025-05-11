import React, { useState, useEffect } from 'react';
import {
    Box,
    Text,
    VStack,
    useToast,
    Spinner,
} from '@chakra-ui/react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';

const containerStyle = {
    width: '100%',
    height: '400px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px'
};

// Set default center to Faisalabad, Pakistan
// Set default center to Millat Town, Faisalabad, Pakistan (coordinates from Google Maps)
const defaultCenter = {
    lat: 31.494910,
    lng: 73.116259
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyCCgamXRuZRFLuKQjEyusczyOQClFa4h7o';

const LocationPicker = ({ initialLocation, onLocationSelect }) => {
    const [selectedLocation, setSelectedLocation] = useState(initialLocation || defaultCenter);
    const [locationName, setLocationName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();

    // Function to get location name using reverse geocoding
    const getLocationName = async (lat, lng) => {
        try {
            console.log('Getting location name for:', lat, lng);
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
            );
            
            console.log('Geocoding response:', response.data);
            
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                // Get the formatted address from the first result
                const address = response.data.results[0].formatted_address;
                console.log('Found address:', address);
                setLocationName(address);
                return address;
            } else {
                console.error('No results found for reverse geocoding');
                
                // If geocoding fails, use a generic name based on coordinates
                const genericName = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                setLocationName(genericName);
                return genericName;
            }
        } catch (error) {
            console.error('Error getting location name:', error);
            // Use a generic name based on coordinates
            const genericName = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setLocationName(genericName);
            return genericName;
        }
    };

    // Update location data with both coordinates and name
    const updateLocationData = async (position) => {
        console.log('Updating location data with position:', position);
        
        // Ensure we have valid coordinates
        if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
            console.error('Invalid position data:', position);
            position = defaultCenter; // Fallback to default center if invalid
        }
        
        // Round coordinates to 6 decimal places for consistency
        const roundedPosition = {
            lat: parseFloat(position.lat.toFixed(6)),
            lng: parseFloat(position.lng.toFixed(6))
        };
        
        // Get location name using reverse geocoding
        const name = await getLocationName(roundedPosition.lat, roundedPosition.lng);
        
        // Create complete location data object
        const locationData = {
            lat: roundedPosition.lat,
            lng: roundedPosition.lng,
            name: name
        };
        
        console.log('Setting selected location to:', roundedPosition);
        setSelectedLocation(roundedPosition);
        
        if (onLocationSelect) {
            console.log('Calling onLocationSelect with:', locationData);
            onLocationSelect(locationData);
        }
    };

    useEffect(() => {
        // Start with initialLocation if provided, otherwise use defaultCenter
        const startingLocation = initialLocation || defaultCenter;
        setSelectedLocation(startingLocation);
        
        // Always try to get the most precise current location
        if (navigator.geolocation) {
            // Use high accuracy option for better precision
            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,        // 10 seconds timeout
                maximumAge: 0          // Always get fresh location
            };
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    console.log('Got current position:', position.coords);
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Always use the actual coordinates from geolocation
                    await updateLocationData(pos);
                    setIsLoading(false);
                    
                    toast({
                        title: 'Current Location Found',
                        description: 'Using your exact current location. You can adjust it by clicking on the map.',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                },
                async (error) => {
                    // Log geolocation error for debugging
                    console.error('Geolocation error:', error.code, error.message);
                    
                    // If geolocation fails, use initialLocation or defaultCenter
                    await updateLocationData(startingLocation);
                    setIsLoading(false);
                    
                    toast({
                        title: 'Using Default Location',
                        description: 'Could not access your current location. You can adjust it by clicking on the map.',
                        status: 'info',
                        duration: 5000,
                        isClosable: true,
                    });
                },
                geoOptions
            );
        } else {
            // If geolocation is not supported, use initialLocation or defaultCenter
            updateLocationData(startingLocation);
            setIsLoading(false);
        }
    }, []);

    const handleMapClick = async (event) => {
        const newLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        await updateLocationData(newLocation);
    };

    if (isLoading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                height="400px"
                border="1px solid #E2E8F0"
                borderRadius="8px"
            >
                <VStack spacing={4}>
                    <Spinner size="xl" />
                    <Text>Loading map...</Text>
                </VStack>
            </Box>
        );
    }

    return (
        <VStack spacing={4} align="stretch">
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} loadingElement={<div>Loading Maps...</div>}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={selectedLocation} // Always center on selected location
                    zoom={17} // Even higher zoom level for better visibility
                    onClick={handleMapClick}
                    options={{
                        fullscreenControl: true,
                        streetViewControl: false,
                        mapTypeControl: true,
                        zoomControl: true,
                        mapTypeId: 'roadmap',
                        gestureHandling: 'cooperative',
                        disableDefaultUI: false,
                        clickableIcons: false, // Disable clickable POIs to prevent marker confusion
                        styles: [
                            {
                                // Style to make the marker more visible
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            }
                        ]
                    }}
                >
                    {/* Always render marker regardless of selectedLocation state */}
                    <Marker
                        key="main-marker"
                        position={selectedLocation}
                        draggable={true}
                        animation={2} // Use BOUNCE animation (2) to make marker more visible
                        visible={true} // Explicitly set visible
                        clickable={true} // Make sure marker is clickable
                        zIndex={1000} // Ensure marker is on top of other elements
                        onDragEnd={async (e) => {
                            const newLocation = {
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng()
                            };
                            await updateLocationData(newLocation);
                        }}
                    />
                </GoogleMap>
            </LoadScript>
            {selectedLocation && (
                <VStack spacing={1} align="stretch">
                    <Text fontSize="sm" color="gray.600">
                        Selected Location: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </Text>
                    {locationName && (
                        <Text fontSize="sm" color="gray.600">
                            Address: {locationName}
                        </Text>
                    )}
                </VStack>
            )}
        </VStack>
    );
};

export default LocationPicker; 