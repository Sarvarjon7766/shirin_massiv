export const normalizeRole=(role:string)=>role==='leader'?'admin':role;
export const canEdit=(role:string)=>['superadmin','manager'].includes(normalizeRole(role));
export const canApprove=canEdit;
export const canOperate=canEdit;
export const canViewStatistics=(role:string)=>['superadmin','admin'].includes(normalizeRole(role));
export const statsScopes={content:'Kontent statistikasi',construction:'Qurilish statistikasi',investments:'Investitsiya statistikasi',appeals:'Murojaatlar statistikasi',tasks:'Vazifalar statistikasi'};
export const defaultStatsScopes=['content','construction','investments'];
export function allowedStatus(role:string,status:string){return canEdit(role)&&['draft','review','published','rejected'].includes(status)}
