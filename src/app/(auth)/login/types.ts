
type LoginRole = "ADMIN" | "MANAGER" | "STAFF";

export interface LoginRequestBody {
    email: string;
    password: string;
    role: LoginRole;
}

export interface LoginUser {
    id: string;
    name: string;
    email: string;
    role: LoginRole;
    status: string;
}

export interface LoginResponseData {
    user: LoginUser;
    redirectTo: string;
}