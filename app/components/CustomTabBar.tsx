import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Timer, Wallet } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface TabBarProps {
  state: any;
  navigation: any;
}

export default function CustomTabBar({ state, navigation }: TabBarProps) {
  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? '#4ADE80' : '#9CA3AF';
    const size = 24;

    switch (routeName) {
      case 'index':
        return <Home size={size} color={color} />;
      case 'auctions':
        return <Timer size={size} color={color} />;
      case 'my-nfts':
        return <Wallet size={size} color={color} />;
      default:
        return null;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Market';
      case 'auctions':
        return 'Auctions';
      case 'my-nfts':
        return 'My NFTs';
      default:
        return routeName;
    }
  };

  return (
    <BlurView intensity={80} tint="dark" style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const label = getLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[
                styles.tab,
                isFocused && styles.tabFocused
              ]}
            >
              {getIcon(route.name, isFocused)}
              <Text style={[
                styles.label,
                isFocused && styles.labelFocused
              ]}>
                {label}
              </Text>
              {isFocused && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  tabFocused: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  labelFocused: {
    color: '#4ADE80',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  indicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ADE80',
  },
}); 