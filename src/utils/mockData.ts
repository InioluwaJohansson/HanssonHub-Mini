export type Gender = 'Male' | 'Female' | 'Other';

export type Role = {
    Id: number;
    Name: string;
}

export type GetPersonDetailsDto = {
    Id: number;
    FirstName: string;
    LastName: string;
    Gender: Gender;
    ImageUrl: string;
    Disabled: boolean;
}

export type GetUserDto = {
    Id: number;
    UserName: string;
    RoleName: string;
    Role: Role;
    PersonId: number;
}

export type GetPersonDto = {
    Id: number;
    PersonId: string;
    Disabled: boolean;
    CameraIds: number[];
    GetPersonDetailsDto: GetPersonDetailsDto;
    GetUserDto: GetUserDto;
}

export type GetLogDto = {
    Id: number;
    GetPersonDto: GetPersonDto;
    PersonId: number;
    ActionType: string;
    TimeOfAction: string;
    LogDetails: string;
}

export const generateMockLogs = (startIndex: number, count: number): GetLogDto[] => {
  return Array.from({ length: count }).map((_, i) => ({
    Id: startIndex + i,
    PersonId: 100 + (startIndex + i) % 5,
    ActionType: ['Login', 'Unlock Door', 'Lock Door', 'View Camera', 'Update Settings'][(startIndex + i) % 5],
    TimeOfAction: new Date(Date.now() - (startIndex + i) * 60000 * 15).toISOString(),
    LogDetails: `System action performed by user. IP address logged.`,
    GetPersonDto: {
      Id: 100 + (startIndex + i) % 5,
      PersonId: `P-${100 + (startIndex + i) % 5}`,
      Disabled: false,
      CameraIds: [1, 2, 3],
      GetPersonDetailsDto: {
        Id: 100 + (startIndex + i) % 5,
        FirstName: ['Jane', 'John', 'Alice', 'Bob', 'Eve'][(startIndex + i) % 5],
        LastName: ['Hansson', 'Doe', 'Smith', 'Johnson', 'Williams'][(startIndex + i) % 5],
        Gender: ['Female', 'Male', 'Female', 'Male', 'Female'][(startIndex + i) % 5] as Gender,
        ImageUrl: `https://i.pravatar.cc/150?u=${100 + (startIndex + i) % 5}`,
        Disabled: false
      },
      GetUserDto: {
        Id: 200 + (startIndex + i) % 5,
        UserName: `user${100 + (startIndex + i) % 5}`,
        RoleName: 'Admin',
        Role: { Id: 1, Name: 'Admin' },
        PersonId: 100 + (startIndex + i) % 5
      }
    }
  }));
};
