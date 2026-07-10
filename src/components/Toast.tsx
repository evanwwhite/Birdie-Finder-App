import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Body } from './Type';
import { C, shadow } from '@/theme/tokens';

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const show = useCallback((m: string) => {
    setMsg(m);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [opacity]);
  return (
    <Ctx.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        <Animated.View pointerEvents="none" style={[{
          position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: C.forest,
          borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, opacity,
        }, shadow.float]}>
          <Body size={13} weight="600" color={C.paper}>{msg}</Body>
        </Animated.View>
      </View>
    </Ctx.Provider>
  );
}
