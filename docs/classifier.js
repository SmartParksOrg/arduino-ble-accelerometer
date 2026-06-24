/*
 * Browser-only rhino behaviour classifier.
 *
 * The centered 3-second static-acceleration estimate needs 75 samples before
 * and after each point. Windows are therefore finalised 1.5 seconds after
 * their final sample arrives. No model calculation is performed on the tag.
 */
class RhinoBehaviourClassifier {
  constructor({ sampleRate = 50, windowSeconds = 4, staticSeconds = 3 } = {}) {
    this.sampleRate = sampleRate;
    this.windowSize = sampleRate * windowSeconds;
    this.staticWindowSize = sampleRate * staticSeconds;
    // A 150-sample mean has its centre between two samples: use 75 samples
    // before and 74 after the target sample, for an exact 150-sample window.
    this.staticSamplesBefore = Math.floor(this.staticWindowSize / 2);
    this.staticSamplesAfter = this.staticWindowSize - this.staticSamplesBefore - 1;
    this.samples = [];
    this.nextWindowStart = this.staticSamplesBefore;
    this.previousWindow = null;
  }

  push(sample) {
    this.samples.push(sample);
    const windowEnd = this.nextWindowStart + this.windowSize - 1;
    if (this.samples.length <= windowEnd + this.staticSamplesAfter) return null;

    const currentWindow = this.buildWindow(this.nextWindowStart);
    const result = this.previousWindow ? this.classify(currentWindow, this.previousWindow) : null;
    this.previousWindow = currentWindow;
    this.nextWindowStart += this.windowSize;
    this.compact();
    return result;
  }

  buildWindow(start) {
    const end = start + this.windowSize;
    return this.samples.slice(start, end).map((sample, index) => {
      const center = start + index;
      const staticAcceleration = ["x", "y", "z"].reduce((values, axis) => {
        let total = 0;
        for (let offset = -this.staticSamplesBefore; offset <= this.staticSamplesAfter; offset++) total += this.samples[center + offset][axis];
        values[axis] = total / this.staticWindowSize;
        return values;
      }, {});
      const dx = sample.x - staticAcceleration.x;
      const dy = sample.y - staticAcceleration.y;
      const dz = sample.z - staticAcceleration.z;
      return { ...sample, mag: Math.hypot(sample.x, sample.y, sample.z), vedba: Math.hypot(dx, dy, dz) };
    });
  }

  classify(current, previous) {
    const features = {
      mag_diff_lag2_meanabs: meanAbsoluteLagDifference(current, "mag", 2),
      vedba_diff_lag2_meanabs_prevwin: meanAbsoluteLagDifference(previous, "vedba", 2),
      mag_diff_lag1_meanabs: meanAbsoluteLagDifference(current, "mag", 1),
      mag_acf1: lagOneCorrelation(current.map(sample => sample.mag)),
      mag_mean_cross_prevwin: meanCrossings(previous.map(sample => sample.mag))
    };
    const prediction = predictRhinoBehaviour(features);
    const first = current[0];
    const last = current.at(-1);
    return {
      timestamp: last.timestamp,
      prediction,
      sampleCount: current.length,
      samplingRateHz: estimateSampleRate(first, last),
      features
    };
  }

  compact() {
    // Keep the preceding 75 samples for the next centered filter calculation.
    const discard = Math.max(0, this.nextWindowStart - this.staticSamplesBefore);
    if (!discard) return;
    this.samples.splice(0, discard);
    this.nextWindowStart -= discard;
  }
}

function meanAbsoluteLagDifference(samples, key, lag) {
  let total = 0;
  for (let index = lag; index < samples.length; index++) total += Math.abs(samples[index][key] - samples[index - lag][key]);
  return total / (samples.length - lag);
}

function lagOneCorrelation(values) {
  const left = values.slice(0, -1);
  const right = values.slice(1);
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index++) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  return leftSquares && rightSquares ? numerator / Math.sqrt(leftSquares * rightSquares) : 0;
}

function meanCrossings(values) {
  const mean = average(values);
  let count = 0;
  for (let index = 1; index < values.length; index++) if ((values[index] - mean) * (values[index - 1] - mean) < 0) count++;
  return count;
}

function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }

function estimateSampleRate(first, last) {
  const elapsedSeconds = (last.timestamp - first.timestamp) / 1000;
  const sampleSteps = Number.isFinite(first.counter) && Number.isFinite(last.counter) ? last.counter - first.counter : 199;
  return elapsedSeconds > 0 ? sampleSteps / elapsedSeconds : 0;
}

function predictRhinoBehaviour(features) {
  if (features.mag_diff_lag2_meanabs < 0.01566581 || features.vedba_diff_lag2_meanabs_prevwin < 0.005286459) return "rest";
  if (features.mag_diff_lag1_meanabs >= 0.07809337 && features.mag_acf1 >= 0.75) return "fast_locomotion";
  if (features.mag_acf1 < 0.8206652) return "eating";
  if (features.mag_acf1 >= 0.8728767 && features.mag_mean_cross_prevwin < 32.4) return "walking";
  return "other_active";
}
