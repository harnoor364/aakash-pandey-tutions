import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

/**
 * A thin, subtle strip of phulkari-style diamonds — the geometric embroidery of
 * Punjabi bagh and phulkari shawls — drawn in muted brass and sage.
 */
export function PhulkariStrip({ height = 14, opacity = 0.55 }: { height?: number; opacity?: number }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const unit = height * 1.4;
  const count = Math.ceil(width / unit) + 1;
  const [a, b, gold, rose] = c.phulkari;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, opacity }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Rect x={0} y={height / 2 - 0.5} width={width} height={1} fill={a} opacity={0.6} />
          {Array.from({ length: count }).map((_, i) => {
            const cx = i * unit + unit / 2;
            const cy = height / 2;
            const r = height / 2 - 1;
            const inner = r * 0.45;
            const outer = i % 2 === 0 ? a : b;
            const center = i % 3 === 0 ? rose : gold;
            return (
              <React.Fragment key={i}>
                <Path d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`} fill="none" stroke={outer} strokeWidth={1.2} />
                <Path d={`M${cx} ${cy - inner} L${cx + inner} ${cy} L${cx} ${cy + inner} L${cx - inner} ${cy} Z`} fill={center} />
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
