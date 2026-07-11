import prisma from '../config/db';

export const hasFolderAccess = async (folderId: string | null | undefined, userId: string): Promise<boolean> => {
  if (!folderId) {
    return true; // Root folder always accessible to self, but files/folders queries filter by ownerId=userId
  }

  let currentFolderId: string | null = folderId;
  
  while (currentFolderId) {
    const folder: any = await prisma.folder.findUnique({ where: { id: currentFolderId } });
    
    if (!folder) return false;
    
    if (folder.ownerId === userId) {
      return true;
    }
    
    const share = await prisma.userFolderShare.findFirst({
      where: { 
        folderId: currentFolderId, 
        sharedWithId: userId, 
        status: 'ACCEPTED' 
      }
    });
    
    if (share) {
      return true;
    }
    
    currentFolderId = folder.parentId;
  }
  
  return false;
};
