const initAscii = () => {
    const pre = document.getElementById('ascii-bg');
    if (!pre) return;
  
    let A = 1.0; // Fixed tilt on X-axis (approx 57 degrees)
    let B = 0;   // Animated rotation on Z-axis
  
    const render = () => {
      const width = 160;
      const height = 44;
      // Initialize buffer with spaces
      const b = new Array(width * height).fill(" ");
      const z = new Array(width * height).fill(0);
  
      let A = 0.8; // Fixed tilt on X-axis (~45 degrees), reveals donut shape better
  
      // Torus parameters
      // R1 (tube radius), R2 (ring radius)
      // K2 (distance from viewer)
      const R1 = 0.7; // Thinner tube -> larger hole
      const R2 = 2.0;
  
      // Iterate theta (j) and phi (i)
      for (let j = 0; j < 6.28; j += 0.07) {
        for (let i = 0; i < 6.28; i += 0.02) {
          // Torus cross-section (theta=j)
          const costheta = Math.cos(j);
          const sintheta = Math.sin(j);
          
          // Torus main ring (phi=i)
          const cosphi = Math.cos(i);
          const sinphi = Math.sin(i);
          
          // Rotation angles
          const cosA = Math.cos(A);
          const sinA = Math.sin(A);
          const cosB = Math.cos(B);
          const sinB = Math.sin(B);

          // Coordinates on the torus surface before rotation
          // x = (R2 + R1*cos(theta)) * cos(phi)
          // y = (R2 + R1*cos(theta)) * sin(phi)  <-- classic torus parameterization usually is (R2 + R1 cos v) cos u, etc.
          // The code uses a specific rotation setup from donut.c
          // Let's stick to the working donut.c math but with R1/R2 scaling
          
          const circX = R2 + R1 * costheta; // circle in x-y plane at distance R2, radius R1 along x
          const circY = R1 * sintheta;
          
          // 3D coordinates after rotation (A around X, B around Z)
          // Based on standard donut.c derivation which is optimized:
          // x = circX * (cosB*cosphi + sinA*sinB*sinphi) - circY * cosA*sinB;
          // y = circX * (sinB*cosphi - sinA*cosB*sinphi) + circY * cosA*cosB;
          // z = K2 + cosA*circX*sinphi + circY*sinA;
          
          // But I'll stick to the variable names I had to minimize drift from the known working state, just cleaner
          
          const c = sinphi;
          const d = costheta;
          const e = sinA;
          const f = sintheta;
          const g = cosA;
          const h = d * R1 + R2; // (R2 + R1*cos(theta))
          const D = 1 / (c * h * e + f * R1 * g + 5); // 1/z. Note f is sin(theta), so f*R1 is y component.
          
          const l = cosphi;
          const m = cosB;
          const n = sinB;
          const t = c * h * g - f * R1 * e;
          
          // Projection
          const x = 0 | (80 + 40 * D * (l * h * m - t * n));
          const y = 0 | (22 + 20 * D * (l * h * n + t * m));
          
          const o = x + width * y;
          
          // Luminance: Normal vector dot Light vector
          // Normal is (cos(theta)*cos(phi), cos(theta)*sin(phi), sin(theta)) rotated same way
          // Simplified from donut.c:
          const N = 0 | (8 * ((f * e - c * d * g) * m - c * d * e - f * g - l * d * n)); 
          // Note: classic donut.c luminance N calculation assumes R1=1 for the normal vector direction, which is correct (normal direction doesn't depend on radius).
          
          if (y < height && y >= 0 && x >= 0 && x < width && D > z[o]) {
            z[o] = D;
            b[o] = ".,-~:;=!*#$@"[N > 0 ? N : 0];
          }
        }
      }
      
      // Build output string
      let output = "";
      for (let k = 0; k < width * height; k++) {
          output += b[k];
          if ((k + 1) % width === 0) output += "\n";
      }
      pre.textContent = output;
      
      // Animate
      B += 0.03;
    };
  
    setInterval(render, 50);
};
  
document.addEventListener('DOMContentLoaded', initAscii);
