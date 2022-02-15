import { IUser } from '@lumieducation/h5p-server';
import { Member } from 'graasp';

class MemberForH5P implements IUser {
  name: string;
  id: string;
  canCreateRestricted: boolean;
  canInstallRecommended: boolean;
  canUpdateAndInstallLibraries: boolean;
  email: string;
  type: string;

  constructor(member: Member) {
    console.log('member: ', member);
    this.name = member.name;
    this.id = member.id;
    this.canCreateRestricted = false;
    this.canInstallRecommended = true; // tochange! <- only admin can install
    this.canUpdateAndInstallLibraries = true; // tochange! <- only admin can install
    this.email = member.email;
    this.type = member.type ?? 'individual';
  }
}

export default MemberForH5P;
