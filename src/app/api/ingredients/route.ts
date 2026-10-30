import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { INGREDIENT_LIST } from "@/data/recipes-seed";
import { ingredientDatabase } from "@/lib/recipe-database.server";
import { enforceSharedLimit } from "@/lib/shared-limits.server";
import { isSameOriginRequest } from "@/lib/request-origin.server";
import { readBoundedJson } from "@/lib/request-body.server";
export const dynamic = "force-dynamic";
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(){try{return reply({ingredients:await ingredientDatabase("list")})}catch{return reply({error:"โหลดวัตถุดิบส่วนกลางไม่ได้"},503)}}
export async function POST(request:NextRequest){
 if(!isSameOriginRequest(request))return reply({error:"ไม่อนุญาตคำขอจากเว็บไซต์อื่น"},403);
 let name:string;
 try{const body=await readBoundedJson(request,2048);if(typeof body?.name!=="string")throw Error();name=body.name.normalize("NFC").trim().replace(/\s+/g," ");if(!name||name.length>80||/[\x00-\x1f<>]/.test(name))throw Error()}catch{return reply({error:"กรอกชื่อวัตถุดิบ 1–80 ตัวอักษร"},400)}
 const existing=INGREDIENT_LIST.find(item=>item.name_th.toLowerCase()===name.toLowerCase());if(existing)return reply({ingredient:existing});
 const limited=await enforceSharedLimit("create");if(limited)return limited;
 try{return reply({ingredient:await ingredientDatabase("save",{id:"custom_"+createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0,24),name_th:name,category:"other",allergens:[],dietary_compatible:[],composition_known:false})},201)}catch{return reply({error:"บันทึกวัตถุดิบไม่ได้ กรุณาลองใหม่ ข้อความยังอยู่"},503)}
}
