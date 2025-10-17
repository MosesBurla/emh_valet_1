import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, ACCESSIBILITY } from '../constants';

interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  icon,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET,
      paddingHorizontal: size === 'small' ? SPACING.md : SPACING.lg,
      paddingVertical: size === 'small' ? SPACING.sm : SPACING.md,
      borderRadius: BORDER_RADIUS.md,
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: disabled ? COLORS.textSecondary : COLORS.primary,
      },
      secondary: {
        backgroundColor: disabled ? COLORS.textSecondary : COLORS.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? COLORS.textSecondary : COLORS.primary,
      },
    };

    return { ...baseStyle, ...variantStyles[variant], ...style };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : 16,
      fontWeight: '600',
      textAlign: 'center',
    };

    const variantTextStyles: Record<string, TextStyle> = {
      primary: {
        color: disabled ? COLORS.textSecondary : COLORS.background,
      },
      secondary: {
        color: disabled ? COLORS.textSecondary : COLORS.background,
      },
      outline: {
        color: disabled ? COLORS.textSecondary : COLORS.primary,
      },
    };

    return { ...baseStyle, ...variantTextStyles[variant], ...textStyle };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {icon && <>{icon}</>}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

export default AccessibleButton;
