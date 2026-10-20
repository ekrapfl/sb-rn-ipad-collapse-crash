import type { Meta, StoryObj } from '@storybook/react-native';
import { Text, View } from 'react-native';

function Widget({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{label}</Text>
    </View>
  );
}

const meta = {
  // Produces the sidebar tree: DEMO > Nested > Widget > One / Two.
  // "Nested" is the collapsible branch row that triggers the crash.
  title: 'Demo/Nested/Widget',
  component: Widget,
  args: { label: 'Widget' },
} satisfies Meta<typeof Widget>;

export default meta;

export const One: StoryObj<typeof meta> = {};
export const Two: StoryObj<typeof meta> = { args: { label: 'Widget two' } };
