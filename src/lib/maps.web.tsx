// Web stand-in for react-native-maps (native-only). The courses screen keeps its
// full list/filter UI on web; the map pane renders as a labeled placeholder.
import React from 'react';
import { View, Text, ViewProps } from 'react-native';

const MapView = React.forwardRef<View, ViewProps & { [prop: string]: any }>(
  ({ children, style, ...rest }, ref) => (
    <View
      ref={ref}
      style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e3d8' }, style]}
      {...rest}
    >
      <Text style={{ color: '#5f5b52', opacity: 0.6 }}>Map available in the iOS app</Text>
      {children}
    </View>
  ),
);

export default MapView;
export const Marker = () => null;
export const Circle = () => null;
