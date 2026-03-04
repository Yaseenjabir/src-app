import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../theme/AppThemeContext";

export function SectionTitle({
  title,
  right,
  onRightPress,
}: {
  title: string;
  right?: string;
  onRightPress?: () => void;
}) {
  const { styles } = useAppTheme();

  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? (
        <TouchableOpacity onPress={onRightPress}>
          <Text style={styles.seeAll}>{right}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ActionPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const { styles } = useAppTheme();

  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function BoxIcon({ label, red }: { label: string; red?: boolean }) {
  const { styles } = useAppTheme();

  return (
    <View style={[styles.boxIcon, red && styles.boxIconRed]}>
      <Text style={[styles.boxIconText, red && styles.boxIconTextRed]}>
        {label}
      </Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const { styles } = useAppTheme();

  return (
    <View style={styles.statCard}>
      <View style={[styles.statTopLine, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

export function Chip({ label, active }: { label: string; active?: boolean }) {
  const { styles } = useAppTheme();

  return (
    <View style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const { styles } = useAppTheme();
  return <View style={styles.card}>{children}</View>;
}

export function SimpleRow({
  title,
  sub,
  right,
  noBorder,
}: {
  title: string;
  sub: string;
  right: string;
  noBorder?: boolean;
}) {
  const { styles } = useAppTheme();

  return (
    <View style={[styles.listItem, noBorder && styles.noBorder]}>
      <View style={styles.itemMain}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{sub}</Text>
      </View>
      <Text style={styles.amount}>{right}</Text>
    </View>
  );
}
