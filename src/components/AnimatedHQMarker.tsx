import React from 'react';
import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';

interface AnimatedHQMarkerProps {
  position: google.maps.LatLngLiteral;
  title?: string;
}

export default function AnimatedHQMarker({ position, title }: AnimatedHQMarkerProps) {
  return (
    <AdvancedMarker position={position} title={title}>
      <motion.div
        animate={{ 
          y: [0, -6, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ originY: 'bottom' }} 
      >
         <Pin background="#012d1d" borderColor="#ffa457" glyphColor="#ffffff" />
         
         {/* Pulse effect circle */}
         <motion.div 
           className="absolute inset-0 rounded-full bg-brand-orange/40"
           initial={{ scale: 0.5, opacity: 0.5 }}
           animate={{ scale: 2, opacity: 0 }}
           transition={{
             duration: 2.5,
             repeat: Infinity,
             ease: "easeOut"
           }}
           style={{ zIndex: -1 }}
         />
      </motion.div>
    </AdvancedMarker>
  );
}
