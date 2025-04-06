import { auth } from '../config/firebase';

export const checkAuthStatus = () => {
  const user = auth.currentUser;
  if (user) {
    console.log('User is authenticated:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    return true;
  } else {
    console.log('User is NOT authenticated');
    return false;
  }
}; 