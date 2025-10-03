// components/messages/DateSeparator.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface DateSeparatorProps {
  dateText: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ dateText }) => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.textContainer}>
        <Text style={styles.dateText}>{dateText}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
    opacity: 0.5,
  },
  textContainer: {
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginHorizontal: 8,
  },
  dateText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DateSeparator;