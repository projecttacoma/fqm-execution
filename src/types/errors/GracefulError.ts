export interface GracefulError {
  message: string;
  type?: string;
  stackTrace?: string;
  localId?: string;
}

export const isOfTypeGracefulError = (tbd: any): tbd is GracefulError => {
  if ((tbd as GracefulError)?.message) {
    return true;
  }
  return false;
};
