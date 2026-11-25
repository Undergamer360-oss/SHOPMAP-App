/* eslint-disable react-hooks/immutability -- Reanimated shared values are
   intentionally mutated from worklets; the React Compiler lint rule cannot
   model that and flags every `.value =` assignment. */
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { Aisle } from '@/data/catalog';
import { storeLayout } from '@/data/layout';
import type { RoutePlan, RoutePoint } from '@/data/route';
import { departmentColor } from '@/theme/department-colors';
import { useAppTheme } from '@/theme/theme-provider';

const MIN_SCALE = 1;
const MAX_SCALE = 7;

const WALL_WIDTH = 1.4;
const DIVIDER_WIDTH = 0.18;

/**
 * `onPress` on an SVG shape turns on react-native-svg's port of the legacy
 * Touchable mixin, which forwards `onStartShouldSetResponder` and friends to the
 * DOM; react-native-web does not understand them and logs six "Unknown event
 * handler property" errors. Its web layer also overwrites `onClick` with
 * `props.onPress` unless that prop is exactly `null`, so the web branch passes
 * `null` there and a plain DOM click does the work instead.
 */
function hitHandlers(onSelect: () => void) {
  if (Platform.OS === 'web') {
    return { onClick: onSelect, onPress: null } as unknown as { onClick: () => void };
  }

  return { onPress: onSelect };
}

type StoreMapProps = {
  highlightedDepartmentId: number | null;
  selectedAisleId: number | null;
  onSelectAisle: (aisle: Aisle) => void;
  /** Bump this to animate the map back to the fitted view. */
  resetKey: number;
  /** When present, draw the planned walking path over the floor plan. */
  route?: RoutePlan | null;
  /** Leg currently being walked (0-based). Drawn on top and in full colour. */
  activeLegIndex?: number | null;
  /** Stop the shopper is heading to (1-based). Its marker is emphasised. */
  activeStopNumber?: number | null;
  /** When present, fit the view to this area instead of the whole store. */
  focusPoints?: RoutePoint[] | null;
};

export function StoreMap({
  highlightedDepartmentId,
  selectedAisleId,
  onSelectAisle,
  resetKey,
  route,
  activeLegIndex = null,
  activeStopNumber = null,
  focusPoints = null,
}: StoreMapProps) {
  const { name: themeName, colors } = useAppTheme();
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const frameWidth = useSharedValue(0);
  const frameHeight = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
  }, [resetKey, scale, translateX, translateY]);

  const gesture = useMemo(() => {
    const clampOffset = (value: number, frame: number, currentScale: number) => {
      'worklet';
      const limit = (frame * (currentScale - 1)) / 2;
      return Math.min(limit, Math.max(-limit, value));
    };

    const pinch = Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale.value * event.scale));
        scale.value = next;
        translateX.value = clampOffset(startX.value, frameWidth.value, next);
        translateY.value = clampOffset(startY.value, frameHeight.value, next);
      });

    const pan = Gesture.Pan()
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        translateX.value = clampOffset(startX.value + event.translationX, frameWidth.value, scale.value);
        translateY.value = clampOffset(startY.value + event.translationY, frameHeight.value, scale.value);
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [scale, translateX, translateY, startScale, startX, startY, frameWidth, frameHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const aisleNodes = storeLayout.aisles;

  const isDimmed = (departmentId: number) =>
    highlightedDepartmentId !== null && departmentId !== highlightedDepartmentId;

  const focused = Boolean(focusPoints && focusPoints.length > 0);

  const viewBox = useMemo(() => {
    const full = `0 0 ${storeLayout.width} ${storeLayout.height}`;
    if (!focused || !focusPoints || frameSize.width <= 0 || frameSize.height <= 0) return full;

    const xs = focusPoints.map((point) => point.x);
    const ys = focusPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 6);
    const spanY = Math.max(maxY - minY, 6);

    let left = minX - Math.max(4, spanX * 0.35);
    let top = minY - Math.max(4, spanY * 0.35);
    let width = spanX + Math.max(4, spanX * 0.35) * 2;
    let height = spanY + Math.max(4, spanY * 0.35) * 2;

    // Match the viewport ratio so the leg is not squashed or padded unevenly.
    const aspect = frameSize.width / frameSize.height;
    if (width / height < aspect) {
      const centreX = left + width / 2;
      width = height * aspect;
      left = centreX - width / 2;
    } else {
      const centreY = top + height / 2;
      height = width / aspect;
      top = centreY - height / 2;
    }

    if (width >= storeLayout.width) {
      left = 0;
      width = storeLayout.width;
    } else {
      left = Math.min(Math.max(left, 0), storeLayout.width - width);
    }

    if (height >= storeLayout.height) {
      top = 0;
      height = storeLayout.height;
    } else {
      top = Math.min(Math.max(top, 0), storeLayout.height - height);
    }

    return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
  }, [focused, focusPoints, frameSize.width, frameSize.height]);

  return (
    <View
      style={[styles.frame, { backgroundColor: colors.surfaceMuted }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        frameWidth.value = width;
        frameHeight.value = height;
        setFrameSize((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height }
        );
      }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={viewBox}>
            {/* Floor slab. */}
            <Rect
              x={0}
              y={0}
              width={storeLayout.width}
              height={storeLayout.height}
              rx={2}
              fill={colors.surface}
            />

            {/* Cross aisles, the action alley and the walkways around the walls. */}
            <G fill={colors.surfaceMuted}>
              {storeLayout.walkways.map((walkway, index) => (
                <Rect
                  key={`walkway-${index}`}
                  x={walkway.x}
                  y={walkway.y}
                  width={walkway.width}
                  height={walkway.height}
                  rx={0.5}
                />
              ))}
            </G>

            {/* Department floor tint. */}
            <G opacity={highlightedDepartmentId === null ? 1 : 0.4}>
              {storeLayout.zones.map((zone, index) => {
                const color = departmentColor(zone.departmentId, themeName);

                return (
                  <Rect
                    key={`zone-${zone.departmentId}-${index}`}
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    rx={1}
                    fill={color.wash}
                  />
                );
              })}
            </G>

            {/* Shelving: one continuous fixture per run, split by department. */}
            {storeLayout.runs.map((run, index) => {
              const color = departmentColor(run.departmentId, themeName);
              const dimmed = isDimmed(run.departmentId);

              return (
                <G key={`run-${index}`} opacity={dimmed ? 0.3 : 1}>
                  <Rect
                    x={run.x}
                    y={run.y}
                    width={run.width}
                    height={run.height}
                    rx={0.5}
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={0.25}
                  />

                  {/* Faint shelf lines so a long run reads as a gondola. */}
                  {run.sections.map((section, sectionIndex) => (
                    <Line
                      key={`shelf-line-${section.aisleId}`}
                      x1={run.x + 0.35}
                      y1={section.y + 0.9}
                      x2={run.x + run.width - 0.35}
                      y2={section.y + 0.9}
                      stroke={color.stroke}
                      strokeOpacity={0.28}
                      strokeWidth={DIVIDER_WIDTH}
                    />
                  ))}

                  {/* Section dividers where the department changes. */}
                  {run.sections.slice(1).map((section) =>
                    run.splitAxis === 'y' ? (
                      <Line
                        key={`divider-${section.aisleId}`}
                        x1={run.x}
                        y1={section.y}
                        x2={run.x + run.width}
                        y2={section.y}
                        stroke={colors.surface}
                        strokeWidth={DIVIDER_WIDTH * 2}
                      />
                    ) : (
                      <Line
                        key={`divider-${section.aisleId}`}
                        x1={section.x}
                        y1={run.y}
                        x2={section.x}
                        y2={run.y + run.height}
                        stroke={colors.surface}
                        strokeWidth={DIVIDER_WIDTH * 2}
                      />
                    )
                  )}
                </G>
              );
            })}

            {/* Selected shelf gets a highlight ring. */}
            {aisleNodes.map((aisle) => {
              if (aisle.id !== selectedAisleId) return null;
              const color = departmentColor(aisle.departmentId, themeName);

              return (
                <Rect
                  key={`selected-${aisle.id}`}
                  x={aisle.x}
                  y={aisle.y}
                  width={aisle.width}
                  height={aisle.height}
                  rx={0.5}
                  fill={color.stroke}
                  stroke={colors.text}
                  strokeWidth={0.7}
                />
              );
            })}

            {/* Planned walking route: context path, then the current leg. */}
            {route ? (
              <G>
                {focused
                  ? null
                  : route.legs.map((leg, index) => {
                      if (index === activeLegIndex) return null;

                      return (
                        <Polyline
                          key={`route-${index}`}
                          points={leg.points.map((point) => `${point.x},${point.y}`).join(' ')}
                          fill="none"
                          stroke={colors.textTertiary}
                          strokeOpacity={0.45}
                          strokeWidth={0.85}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })}

                {route.legs.map((leg, index) => {
                  if (index !== activeLegIndex) return null;

                  return (
                    <G key={`route-active-${index}`}>
                      <Polyline
                        points={leg.points.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="none"
                        stroke={colors.surface}
                        strokeOpacity={0.9}
                        strokeWidth={1.9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Polyline
                        points={leg.points.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="none"
                        stroke={colors.accent}
                        strokeWidth={1.15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </G>
                  );
                })}
              </G>
            ) : null}

            {/* Start marker. Every planned route begins at the entrance. */}
            {route ? (
              <G>
                <Circle
                  cx={route.start.x}
                  cy={route.start.y}
                  r={activeLegIndex === 0 ? 3.1 : 2.4}
                  fill={activeLegIndex === 0 ? colors.accent : colors.surface}
                  stroke={activeLegIndex === 0 ? colors.accent : colors.textTertiary}
                  strokeWidth={0.6}
                />
                <SvgText
                  x={route.start.x}
                  y={route.start.y + 0.9}
                  fontSize={activeLegIndex === 0 ? 2.8 : 2.2}
                  fontWeight="700"
                  fill={activeLegIndex === 0 ? colors.surface : colors.textSecondary}
                  textAnchor="middle">
                  S
                </SvgText>
                {activeLegIndex === 0 ? (
                  <SvgText
                    x={route.start.x}
                    y={route.start.y - 3.8}
                    fontSize={1.9}
                    fontWeight="700"
                    letterSpacing={0.1}
                    fill={colors.accent}
                    textAnchor="middle">
                    START
                  </SvgText>
                ) : null}
              </G>
            ) : null}

            {/* Tap targets, one per shelf section. */}
            {aisleNodes.map((aisle) => (
              <Rect
                key={`hit-${aisle.id}`}
                x={aisle.hit.x}
                y={aisle.hit.y}
                width={aisle.hit.width}
                height={aisle.hit.height}
                fill="transparent"
                {...hitHandlers(() => onSelectAisle(aisle))}
              />
            ))}

            {/* Department names printed along the shelving. */}
            {storeLayout.runs.map((run, index) => {
              if (!run.label) return null;

              const color = departmentColor(run.departmentId, themeName);
              const dimmed = isDimmed(run.departmentId);
              const centreX = run.x + run.width / 2;
              const centreY = run.y + run.height / 2;

              return (
                <SvgText
                  key={`label-${index}`}
                  x={centreX}
                  y={centreY + run.label.size / 3}
                  fontSize={run.label.size}
                  fontWeight="700"
                  letterSpacing={0.04}
                  fill={color.stroke}
                  opacity={dimmed ? 0.4 : 0.95}
                  textAnchor="middle"
                  transform={
                    run.label.vertical
                      ? `rotate(-90 ${centreX} ${centreY})`
                      : undefined
                  }>
                  {run.label.text}
                </SvgText>
              );
            })}

            {/* Aisle numbers, repeated at the end of every block. */}
            {storeLayout.aisleMarkers.map((marker, index) => (
              <G key={`marker-${index}`}>
                <Circle
                  cx={marker.x}
                  cy={marker.y}
                  r={1.6}
                  fill={colors.primary}
                />
                <SvgText
                  x={marker.x}
                  y={marker.y + 0.68}
                  fontSize={1.8}
                  fontWeight="700"
                  fill={colors.onPrimary}
                  textAnchor="middle">
                  {marker.number}
                </SvgText>
              </G>
            ))}

            {/* Checkout lanes: conveyor belt, register and a lane divider. */}
            <G>
              {storeLayout.checkouts.map((lane, index) => (
                <G key={`checkout-${index}`}>
                  <Rect
                    x={lane.x}
                    y={lane.y}
                    width={lane.width}
                    height={lane.height}
                    rx={0.7}
                    fill={colors.surfaceMuted}
                    stroke={colors.border}
                    strokeWidth={0.2}
                  />
                  <Rect
                    x={lane.x + 0.6}
                    y={lane.y + 0.9}
                    width={lane.width - 1.2}
                    height={3.4}
                    rx={0.5}
                    fill={colors.primarySoft}
                    stroke={colors.primary}
                    strokeWidth={0.15}
                  />
                  <Circle
                    cx={lane.x + lane.width / 2}
                    cy={lane.y + 6}
                    r={0.85}
                    fill={colors.primary}
                  />
                </G>
              ))}

              {storeLayout.checkoutLabels.map((label, index) => (
                <SvgText
                  key={`checkout-label-${index}`}
                  x={label.x}
                  y={label.y}
                  fontSize={1.9}
                  fontWeight="700"
                  letterSpacing={0.12}
                  fill={colors.textTertiary}
                  textAnchor="middle">
                  CHECKOUT
                </SvgText>
              ))}
            </G>

            {/* Numbered stops on the planned route. */}
            {route
              ? route.stops.map((stop) => {
                  const active = stop.number === activeStopNumber;

                  return (
                    <G key={`stop-${stop.number}`}>
                      <Circle
                        cx={stop.point.x}
                        cy={stop.point.y}
                        r={active ? 2.9 : 2.3}
                        fill={active ? colors.accent : colors.surface}
                        stroke={active ? colors.accent : colors.textTertiary}
                        strokeWidth={active ? 0.7 : 0.45}
                      />
                      <SvgText
                        x={stop.point.x}
                        y={stop.point.y + 0.85}
                        fontSize={active ? 2.8 : 2.3}
                        fontWeight="700"
                        fill={active ? colors.surface : colors.textSecondary}
                        textAnchor="middle">
                        {stop.number}
                      </SvgText>
                    </G>
                  );
                })
              : null}

            {/* Store walls, with a gap and doors at the entrance. */}
            <Rect
              x={WALL_WIDTH / 2}
              y={WALL_WIDTH / 2}
              width={storeLayout.width - WALL_WIDTH}
              height={storeLayout.height - WALL_WIDTH}
              rx={2}
              fill="none"
              stroke={colors.border}
              strokeWidth={WALL_WIDTH}
            />
            <Rect
              x={storeLayout.entrance.x - storeLayout.entrance.width / 2}
              y={storeLayout.height - WALL_WIDTH * 1.6}
              width={storeLayout.entrance.width}
              height={WALL_WIDTH * 3.2}
              fill={colors.surface}
            />
            <Rect
              x={storeLayout.entrance.x - storeLayout.entrance.width / 2}
              y={storeLayout.height - 2.4}
              width={storeLayout.entrance.width / 2 - 0.4}
              height={1.6}
              rx={0.3}
              fill={colors.primarySoft}
              stroke={colors.primary}
              strokeWidth={0.2}
            />
            <Rect
              x={storeLayout.entrance.x + 0.4}
              y={storeLayout.height - 2.4}
              width={storeLayout.entrance.width / 2 - 0.4}
              height={1.6}
              rx={0.3}
              fill={colors.primarySoft}
              stroke={colors.primary}
              strokeWidth={0.2}
            />
            <SvgText
              x={storeLayout.entrance.x}
              y={storeLayout.height - 4.6}
              fontSize={2.1}
              fontWeight="700"
              letterSpacing={0.12}
              fill={colors.primary}
              textAnchor="middle">
              ENTRANCE
            </SvgText>
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});
