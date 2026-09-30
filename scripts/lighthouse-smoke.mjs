export function isUnexpectedAuthRedirect(requestedPath, destinationPath) {
  return requestedPath !== '/sign-in' && destinationPath === '/sign-in';
}
