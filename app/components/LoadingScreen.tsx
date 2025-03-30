import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoadingWave from './LoadingWave';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <LoadingWave color="#4ADE80" size={10} count={5} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 16,
  },
}); 