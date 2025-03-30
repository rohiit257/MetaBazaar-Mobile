import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface LoadingWaveProps {
  color?: string;
  size?: number;
  count?: number;
}

export default function LoadingWave({ 
  color = '#4ADE80', 
  size = 8, 
  count = 5 
}: LoadingWaveProps) {
  // Create an array of animated values for each dot
  const animations = Array.from({ length: count }, () => new Animated.Value(0));

  useEffect(() => {
    const createAnimation = (index: number) => {
      return Animated.sequence([
        // Delay each dot's animation
        Animated.delay(index * 120),
        // Create a loop
        Animated.loop(
          Animated.sequence([
            // Move up
            Animated.timing(animations[index], {
              toValue: 1,
              duration: 600,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            // Move down
            Animated.timing(animations[index], {
              toValue: 0,
              duration: 600,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    // Start animations for each dot
    const animationArray = animations.map((_, index) => createAnimation(index));
    Animated.parallel(animationArray).start();

    // Cleanup animations
    return () => {
      animationArray.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      {animations.map((animation, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              marginHorizontal: size / 2,
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(size * 2)],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dot: {
    backgroundColor: '#4ADE80',
  },
}); 