import { createPatchInstance } from '@web-kits/audio';
import { _patch } from '../../.web-kits/playful';

const patch = createPatchInstance(_patch);

function play(name: string) {
  try {
    patch.play(name);
  } catch {
    // audio not available (e.g. no user gesture yet)
  }
}

export const sounds = {
  copy: () => play('copy'),
  select: () => play('select'),
  move: () => play('copy'),
  send: () => play('send'),
  success: () => play('success'),
  notification: () => play('notification'),
  error: () => play('error'),
};
