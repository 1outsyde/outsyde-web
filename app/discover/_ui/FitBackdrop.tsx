"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> like the rest of Discover; feed media comes from many hosts */
/**
 * The blurred picture behind a Fit video (photo ratios, same look as the app's FitBackdrop):
 * the video's own still, blurred and darkened, filling the box. Black when there is no still.
 * Put it first in the box, then the video with fit="fit" on top.
 */
import styles from "./discover.module.css";

export default function FitBackdrop({ src }: { src: string | null }) {
  if (!src) return <div className={styles.fitBackdropBlack} aria-hidden="true" />;
  return (
    <div className={styles.fitBackdrop} aria-hidden="true" data-testid="fit-backdrop">
      <img src={src} alt="" loading="lazy" draggable={false} />
    </div>
  );
}
