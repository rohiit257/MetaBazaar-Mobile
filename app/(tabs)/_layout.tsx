import { Tabs } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 20,
        },
        tabBarStyle: {
          display: 'none', // Hide default tab bar since we're using custom
        },
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Marketplace',
          headerTitle: 'MetaBazaar',
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Auctions',
        }}
      />
      <Tabs.Screen
        name="my-nfts"
        options={{
          title: 'My NFTs',
        }}
      />
    </Tabs>
  );
}