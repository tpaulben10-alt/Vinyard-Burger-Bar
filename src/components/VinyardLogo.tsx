import React from 'react';

interface VinyardLogoProps {
  className?: string;
  size?: number | string;
}

export default function VinyardLogo({ className = "", size = "100%" }: VinyardLogoProps) {
  return (
    <svg 
      viewBox="0 0 500 500" 
      width={size} 
      height={size} 
      className={`${className} select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Curved path for the 'EST. 2020' text */}
        <path 
          id="textCurve" 
          d="M 120,225 A 145,145 0 0,1 380,225" 
          fill="none" 
        />
        {/* Subtle drop shadow for the logo */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#041a10" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#logoShadow)">
        {/* Main dark green outer badge */}
        <path 
          d="M 80,230 
             C 80,110 156,60 250,60 
             C 344,60 420,110 420,230 
             C 420,290 390,320 390,320 
             L 110,320 
             C 110,320 80,290 80,230 Z" 
          fill="#023b26" 
        />

        {/* Orange inner circle body */}
        <path 
          d="M 100,230 
             C 100,125 167,80 250,80 
             C 333,80 400,125 400,230 
             C 400,270 380,305 350,305 
             L 150,305 
             C 120,305 100,270 100,230 Z" 
          fill="#fa9950" 
          stroke="#023b26"
          strokeWidth="6"
        />

        {/* Outer green circle frame lines in the orange area */}
        <path 
          d="M 112,230 A 138,138 0 0,1 388,230" 
          fill="none" 
          stroke="#023b26" 
          strokeWidth="2" 
          strokeDasharray="6,4" 
        />

        {/* EST. 2020 Arced Text */}
        <text className="font-mono text-[26px] font-extrabold uppercase fill-[#023b26]" letterSpacing="11">
          <textPath href="#textCurve" startOffset="50%" textAnchor="middle">
            EST. 2020
          </textPath>
        </text>

        {/* White Star Left */}
        <g transform="translate(112, 235) scale(0.9)">
          <circle cx="0" cy="0" r="18" fill="#023b26" />
          <polygon 
            points="0,-10 3,-3 10,-3 5,2 7,9 0,5 -7,9 -5,2 -10,-3 -3,-3" 
            fill="#ffffff" 
          />
        </g>

        {/* White Star Right */}
        <g transform="translate(388, 235) scale(0.9)">
          <circle cx="0" cy="0" r="18" fill="#023b26" />
          <polygon 
            points="0,-10 3,-3 10,-3 5,2 7,9 0,5 -7,9 -5,2 -10,-3 -3,-3" 
            fill="#ffffff" 
          />
        </g>

        {/* Burger Illustration in Center */}
        <g transform="translate(250, 222)">
          {/* Bun Shadow */}
          <ellipse cx="0" cy="38" rx="72" ry="12" fill="#023b26" opacity="0.12" />

          {/* Bottom Bun */}
          <path 
            d="M -60,25 C -60,25 -55,38 -45,41 C -35,43 35,43 45,41 C 55,38 60,25 60,25" 
            fill="#e29b4b" 
            stroke="#023b26" 
            strokeWidth="5.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M -54,26 C -40,32 -10,33 10,33 C 30,33 46,30 54,26" 
            fill="#f7be7e" 
            opacity="0.4"
          />

          {/* Grilled Patty */}
          <path 
            d="M -67,11 C -67,11 -68,26 -55,27 C -42,28 -30,22 0,22 C 30,22 42,28 55,27 C 68,26 67,11 67,11 C 67,11 63,4 50,7 C 37,10 25,5 0,5 C -25,5 -37,10 -50,7 C -63,4 -67,11 -67,11 Z" 
            fill="#543118" 
            stroke="#023b26" 
            strokeWidth="5.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Patty Texture/Grill Marks */}
          <circle cx="-35" cy="15" r="3" fill="#361a0b" />
          <circle cx="-10" cy="12" r="2.5" fill="#361a0b" />
          <circle cx="15" cy="15" r="3" fill="#361a0b" />
          <circle cx="40" cy="13" r="2" fill="#361a0b" />
          <path d="M -45,12 Q -35,16 -25,12" stroke="#361a0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 5,12 Q 15,16 25,12" stroke="#361a0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Melted Cheese Slices */}
          <path 
            d="M -63,9 L 55,9 L 45,21 L 20,9 L -10,18 L -35,9 L -55,18 Z" 
            fill="#ffc82c" 
            stroke="#023b26" 
            strokeWidth="5" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />

          {/* Tomato Slices (Two big delicious slices) */}
          {/* Left Tomato */}
          <path 
            d="M -50,-8 C -50,-8 -54,-1 -40,1 C -26,3 -15,-3 -15,-3" 
            stroke="#023b26" 
            strokeWidth="11" 
            strokeLinecap="round" 
          />
          <path 
            d="M -48,-8 C -48,-8 -52,-2 -40,0 C -28,2 -17,-3 -17,-3" 
            stroke="#d42f1d" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
          {/* Right Tomato */}
          <path 
            d="M 12,-3 C 12,-3 14,3 28,1 C 42,-1 46,-8 46,-8" 
            stroke="#023b26" 
            strokeWidth="11" 
            strokeLinecap="round" 
          />
          <path 
            d="M 14,-3 C 14,-3 16,2 28,0 C 40,-2 44,-8 44,-8" 
            stroke="#d42f1d" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />

          {/* Wavy Fresh Lettuce Layer */}
          <path 
            d="M -65,3 
               C -60,-4 -54,-3 -50,2 
               C -46,7 -38,5 -35,-2 
               C -32,-9 -24,-7 -20,-1 
               C -16,5 -8,5 -5,-2 
               C -2,-9 6,-8 10,-2 
               C 14,4 22,4 25,-2 
               C 28,-8 36,-8 40,-2 
               C 44,4 52,2 55,-4 
               C 58,-10 63,-8 65,3
               C 67,11 60,11 55,9
               C 42,4 32,5 25,9
               C 15,13 -15,11 -25,9
               C -35,7 -45,4 -55,9
               C -60,11 -67,11 -65,3 Z" 
            fill="#52b13c" 
            stroke="#023b26" 
            strokeWidth="5.5" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          {/* Lettuce Highlights */}
          <path d="M -48,0 C -45,3 -41,2 -38,0" stroke="#a2e269" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M -18,-2 C -15,1 -11,0 -8,-2" stroke="#a2e269" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 12,-2 C 15,1 19,0 22,-2" stroke="#a2e269" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 42,0 C 45,3 49,2 52,0" stroke="#a2e269" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Top Sesame Bun */}
          <path 
            d="M -64,-6 
               C -64,-6 -68,-40 -20,-52 
               C 28,-64 68,-36 64,-6 
               C 64,-6 56,-14 30,-12 
               C 4,-10 -4,-18 -30,-12
               C -56,-6 -64,-6 -64,-6 Z" 
            fill="#e29b4b" 
            stroke="#023b26" 
            strokeWidth="5.5" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          {/* Bun Highlight */}
          <path 
            d="M -50,-24 C -45,-38 -15,-46 15,-44 C 35,-42 50,-30 52,-20" 
            fill="none"
            stroke="#f7be7e" 
            strokeWidth="5.5" 
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Sesame Seeds */}
          {/* Angle 15deg (x, y) */}
          <g fill="#fbe8cc" stroke="#023b26" strokeWidth="1.5">
            {/* Center Area */}
            <path d="M -10,-42 c 0.5,1 2,0.5 2.5,-0.5 c 0,-1 -1,-2 -2,-2 C -10.5,-44.5 -10,-43 -10,-42" />
            <path d="M 12,-38 c 0.5,1 2,0.5 2.5,-0.5 c 0,-1 -1,-2 -2,-2 C 11.5,-40.5 12,-39 12,-38" />
            <path d="M -30,-34 c 1,0.5 2,-0.5 2,-1.5 c -1,-1 -2,-0.5 -2.5,0.5 C -31,-34.5 -30,-34 -30,-34" />
            <path d="M 30,-30 c 1,0.5 2,-0.5 2,-1.5 c -1,-1 -2,-0.5 -2.5,0.5 C 29,-30.5 30,-30 30,-30" />
            {/* Lower row */}
            <path d="M -45,-20 c 0.5,1 2,0.5 2.5,-0.5 c 0,-1 -1,-2 -2,-2 C -45.5,-22.5 -45,-21 -45,-20" />
            <path d="M -15,-26 c -1,0.5 -1.5,1.5 -1,2.5 c 1,0.5 2,-0.5 2,-1.5 C -14,-26.5 -15,-26 -15,-26" />
            <path d="M 10,-22 c 0.5,1 2,0.5 2.5,-0.5 c 0,-1 -1,-2 -2,-2 C 9.5,-24.5 10,-23 10,-22" />
            <path d="M 45,-18 c -1,0.5 -1.5,1.5 -1,2.5 c 1,0.5 2,-0.5 2,-1.5 C 46,-18.5 45,-18 45,-18" />
          </g>
        </g>

        {/* Bottom Banner Base Accent (Evergreen Rounded Wrapper) */}
        <path 
          d="M 90,320
             C 90,320 60,320 60,350
             C 60,380 90,380 90,380
             L 410,380
             C 410,380 440,380 440,350
             C 440,320 410,320 410,320
             Z" 
          fill="#023b26" 
          stroke="#023b26"
          strokeWidth="6"
          strokeLinejoin="round" 
        />

        {/* VINYARD - Beautiful slab-serif layout style */}
        <text 
          x="250" 
          y="354" 
          fontFamily="'Times New Roman', Georgia, serif" 
          fontWeight="bold" 
          fontSize="46" 
          fill="#ffffff" 
          textAnchor="middle" 
          letterSpacing="2"
        >
          VINYARD
        </text>

        {/* BURGER BAR - Clean secondary typography */}
        <text 
          x="250" 
          y="373" 
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif" 
          fontWeight="900" 
          fontSize="14" 
          fill="#ffffff" 
          textAnchor="middle" 
          letterSpacing="4"
          opacity="0.95"
        >
          BURGER BAR
        </text>
      </g>
    </svg>
  );
}
