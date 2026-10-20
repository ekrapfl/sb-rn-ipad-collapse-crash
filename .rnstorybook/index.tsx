import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { view } from './storybook.requires';

const StorybookUI = view.getStorybookUI({});

export default function StorybookUIRoot() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StorybookUI />
    </SafeAreaProvider>
  );
}
