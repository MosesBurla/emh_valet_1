import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';

const { width } = Dimensions.get('window');

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'full';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 3
}) => {
  if (type === 'full') {
    return <FullScreenSkeleton />;
  }

  if (type === 'list') {
    return <ListSkeleton count={count} />;
  }

  return <CardSkeleton count={count} />;
};

const CardSkeleton = ({ count }: { count: number }) => (
  <View style={styles.container}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <SkeletonItem style={styles.titleSkeleton} />
            <SkeletonItem style={styles.chipSkeleton} />
          </View>
          <SkeletonItem style={styles.textSkeleton} />
          <SkeletonItem style={styles.textSkeleton} />
          <SkeletonItem style={styles.textSkeleton} />
          <View style={styles.actionsSkeleton} />
        </Card.Content>
      </Card>
    ))}
  </View>
);

const ListSkeleton = ({ count }: { count: number }) => (
  <View style={styles.container}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.listItem}>
        <SkeletonItem style={styles.avatarSkeleton} />
        <View style={styles.listContent}>
          <SkeletonItem style={styles.listTitleSkeleton} />
          <SkeletonItem style={styles.listTextSkeleton} />
        </View>
        <SkeletonItem style={styles.actionSkeleton} />
      </View>
    ))}
  </View>
);

const FullScreenSkeleton = () => (
  <View style={styles.fullContainer}>
    <SkeletonItem style={styles.headerSkeleton} />
    <View style={styles.body}>
      <SkeletonItem style={styles.largeSkeleton} />
      <SkeletonItem style={styles.mediumSkeleton} />
      <SkeletonItem style={styles.smallSkeleton} />
    </View>
  </View>
);

const SkeletonItem = ({ style }: { style: any }) => (
  <View style={[styles.skeleton, style]} />
);

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  fullContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
  },
  titleSkeleton: {
    height: 20,
    width: '60%',
  },
  chipSkeleton: {
    height: 24,
    width: 60,
    borderRadius: BORDER_RADIUS.lg,
  },
  textSkeleton: {
    height: 16,
    width: '80%',
    marginBottom: SPACING.sm,
  },
  actionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    height: 36,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  avatarSkeleton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  listContent: {
    flex: 1,
  },
  listTitleSkeleton: {
    height: 18,
    width: '70%',
    marginBottom: SPACING.xs,
  },
  listTextSkeleton: {
    height: 14,
    width: '50%',
  },
  actionSkeleton: {
    height: 32,
    width: 80,
    borderRadius: BORDER_RADIUS.sm,
  },
  headerSkeleton: {
    height: 60,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  largeSkeleton: {
    height: 120,
    width: width - 32,
    marginBottom: SPACING.md,
  },
  mediumSkeleton: {
    height: 80,
    width: width - 32,
    marginBottom: SPACING.md,
  },
  smallSkeleton: {
    height: 40,
    width: width - 32,
  },
});

export default LoadingSkeleton;
