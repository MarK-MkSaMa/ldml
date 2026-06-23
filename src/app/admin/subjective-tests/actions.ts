"use server";

import { revalidatePath } from "next/cache";
import { subjectiveTestStatusEnum, type SubjectiveTestStatus } from "@/db/schema";
import { requireAdminFresh } from "@/lib/current-user";
import {
  createSubjectiveTestActivity,
  createSubjectiveTestEntry,
  deleteSubjectiveTestEntry,
  updateSubjectiveTestActivity,
  updateSubjectiveTestEntry,
  updateSubjectiveTestStatus,
} from "@/lib/subjective-tests";

function bust() {
  revalidatePath("/admin/subjective-tests");
  revalidatePath("/subjective-tests");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStatus(formData: FormData) {
  const status = getString(formData, "status");
  if (!subjectiveTestStatusEnum.includes(status as SubjectiveTestStatus)) throw new Error("活动状态无效");
  return status as SubjectiveTestStatus;
}

function getActivityInput(formData: FormData) {
  const categoryId = Number(getString(formData, "categoryId"));
  return {
    title: getString(formData, "title"),
    categoryId,
    requirement: getString(formData, "requirement"),
    resultNote: getString(formData, "resultNote") || null,
    linuxdoUrl: getString(formData, "linuxdoUrl") || null,
    status: getStatus(formData),
  };
}

export async function createSubjectiveTestActivityAction(formData: FormData) {
  const admin = await requireAdminFresh();
  await createSubjectiveTestActivity({ ...getActivityInput(formData), createdBy: admin.id });
  bust();
}

export async function updateSubjectiveTestActivityAction(formData: FormData) {
  await requireAdminFresh();
  const id = getString(formData, "id");
  if (!id) throw new Error("活动 ID 缺失");
  await updateSubjectiveTestActivity(id, getActivityInput(formData));
  bust();
  revalidatePath(`/subjective-tests/${id}`);
}

export async function updateSubjectiveTestStatusAction(formData: FormData) {
  await requireAdminFresh();
  const id = getString(formData, "id");
  if (!id) throw new Error("活动 ID 缺失");
  await updateSubjectiveTestStatus(id, getStatus(formData));
  bust();
  revalidatePath(`/subjective-tests/${id}`);
}

export async function createSubjectiveTestEntryAction(formData: FormData) {
  await requireAdminFresh();
  const activityId = getString(formData, "activityId");
  await createSubjectiveTestEntry({
    activityId,
    modelName: getString(formData, "modelName"),
    output: getString(formData, "output"),
    order: Number(getString(formData, "order")),
  });
  bust();
  revalidatePath(`/subjective-tests/${activityId}`);
}

export async function updateSubjectiveTestEntryAction(formData: FormData) {
  await requireAdminFresh();
  const id = getString(formData, "id");
  const activityId = getString(formData, "activityId");
  if (!id) throw new Error("输出 ID 缺失");
  await updateSubjectiveTestEntry(id, {
    activityId,
    modelName: getString(formData, "modelName"),
    output: getString(formData, "output"),
    order: Number(getString(formData, "order")),
  });
  bust();
  revalidatePath(`/subjective-tests/${activityId}`);
}

export async function deleteSubjectiveTestEntryAction(formData: FormData) {
  await requireAdminFresh();
  const id = getString(formData, "id");
  const activityId = getString(formData, "activityId");
  if (!id) throw new Error("输出 ID 缺失");
  await deleteSubjectiveTestEntry(id);
  bust();
  if (activityId) revalidatePath(`/subjective-tests/${activityId}`);
}
