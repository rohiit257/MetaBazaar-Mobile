import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import LoadingWave from './components/LoadingWave';

export default function SplashScreen() {
  const router = useRouter();
  
  useEffect(() => {
    // Navigate to main screen after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFT Marketplace</Text>
      <Text style={styles.subtitle}>Your Gateway to Digital Art</Text>
      <LoadingWave color="#4ADE80" size={12} count={7} />
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
  title: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginBottom: 48,
  },
}); 