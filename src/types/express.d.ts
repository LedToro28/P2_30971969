import { User as CustomUser } from '../models/UserModel';

declare global {
  namespace Express {
    interface User extends CustomUser {}
  }
}