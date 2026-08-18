import {
getPaymentDistribution
} from "@/services/report.service";


import {
requireAuth
} from "@/lib/auth/require-auth";


import {
getAdminId
} from "@/lib/auth/get-admin-id";


import {
success,
failure
} from "@/lib/api/response";


export async function GET(req:Request){

try{

const auth=
await requireAuth(req);


const data=
await getPaymentDistribution({

adminId:getAdminId(auth)

});


return success(data);


}catch(error){

return failure(
"Unable to fetch payment report",
500,
"REPORT_ERROR"
);


}

}