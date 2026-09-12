"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiFetch } from "@/lib/apiClient";

/**
 * API-аас өгөгдөл татах жижиг hook.
 *
 * ЯАГААД SWR / React Query БИШ ВЭ: тэдгээр нь кэш хүчингүй болгох, фон
 * шинэчлэлт, хуудаслалт зэрэг бидэнд хэрэггүй боломжуудын төлөө 15-40KB
 * нэмдэг. Tactiq-ийн дэлгэц бүр нэг л хүсэлт явуулж, хэрэглэгчийн үйлдлийн
 * дараа гараар шинэчилдэг — тэр нь 60 мөрөөр шийдэгдэнэ.
 *
 * `path` нь `null` бол хүсэлт явуулахгүй — өөр өгөгдөл хүлээж байгаа үед
 * (жишээ нь id хараахан мэдэгдээгүй) хоосон дуудалт хийхээс сэргийлнэ.
 */

/**
 * Төлөвт ТАТСАН ЗАМЫГ хамт хадгална.
 *
 * `loading`-ийг тусад нь хадгалахын оронд эндээс ГАРГАЖ АВНА: "хүссэн зам нь
 * татагдсан замаас өөр бол ачаалж байна". Ингэснээр эффект дотор
 * `setState(loading: true)` гэж СИНХРОН дуудах шаардлагагүй болно — тэр нь
 * нэмэлт рендер үүсгэдэг ба React-ийн шалгагч зүй ёсоор анхааруулдаг.
 */
type State<T> = {
  /** Одоогийн `data`/`error` аль замынх вэ. `undefined` = хараахан татаагүй */
  path: string | null | undefined;
  data: T | null;
  error: string | null;
  /** `ApiError.code` — тодорхой алдааны төрлөөр (жишээ нь "no-profile") UI салгахад */
  code: string | undefined;
  /** `ApiError.payload` бүхэлдээ — алдааны нэмэлт өгөгдөл */
  payload: Record<string, unknown> | undefined;
};

export function useApiData<T>(
  path: string | null,
  options: { authOptional?: boolean } = {}
) {
  const { authOptional = false } = options;

  const [state, setState] = useState<State<T>>({
    path: undefined,
    data: null,
    error: null,
    code: undefined,
    payload: undefined,
  });

  /**
   * Хүсэлт бүрийг дугаарлана.
   *
   * Хэрэглэгч хурдан шилжихэд (курс A → курс B) хоёр хүсэлт нисэх ба
   * АЛИНЬ НЬ ЭХЭЛЖ ИРЭХ нь тодорхойгүй. Дугаарлахгүй бол хоцорсон хариу
   * шинийг дарж, буруу курсын агуулга гарч ирнэ.
   */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    // Дугаарыг ЭХЭЛЖ ахиулна — нисэж яваа хуучин хүсэлт хариу нь ирэхэд
    // өөрийгөө хүчингүй гэж таньж, шинэ төлөвийг дарж бичихгүй.
    const id = ++requestId.current;

    // `path` байхгүй бол төлөв БИЧИХГҮЙ: доорх буцаах утга нь
    // `state.path !== path` гэдгээр аль хэдийн хоосон дүн өгнө. Энд бичвэл
    // эффектээс синхрон setState дуудагдаж, илүү рендер үүснэ.
    if (!path) return;

    try {
      const data = await apiFetch<T>(path, { authOptional });
      if (id !== requestId.current) return;
      setState({ path, data, error: null, code: undefined, payload: undefined });
    } catch (cause) {
      if (id !== requestId.current) return;
      setState({
        path,
        data: null,
        error: cause instanceof Error ? cause.message : "Алдаа гарлаа.",
        code: cause instanceof ApiError ? cause.code : undefined,
        payload: cause instanceof ApiError ? cause.payload : undefined,
      });
    }
  }, [path, authOptional]);

  /*
   * Дүрмийг ЭНД зориудаар унтраав.
   *
   * `react-hooks/set-state-in-effect` нь эффектээс setState дууддаг ямар ч
   * функц дуудахыг хориглодог — `await`-ын ДАРАА дуудагдсан ч ялгаагүй,
   * учир нь шалгагч нь статик. Дүрмийн зорилго нь "рендерээс тооцоолж болох
   * утгыг эффектээр хойшлуулах"-аас сэргийлэх явдал; энд `loading`, `data`
   * хоёулаа рендерээс ГАРГАЖ АВАГДДАГ (дээрх `state.path` харна уу) бөгөөд
   * бичилт нь зөвхөн сүлжээний хариу ирсний дараа явагдана.
   *
   * Үүнийг эффектгүйгээр хийх цорын ганц зам нь Suspense-д суурилсан дата
   * давхарга (React Query, SWR) нэмэх — 15-40KB-ийн үнэ нь энэ hook-ийн
   * шийддэг асуудалд зохисгүй.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /** Хариуг гараар засах — сервер рүү дахин хандахгүйгээр UI-г шинэчилнэ */
  const patch = useCallback((updater: (current: T) => T) => {
    setState((current) =>
      current.data ? { ...current, data: updater(current.data) } : current
    );
  }, []);

  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : null,
    code: state.path === path ? state.code : undefined,
    payload: state.path === path ? state.payload : undefined,
    // Хүссэн зам нь татагдсан замаас өөр бол хариу хараахан ирээгүй байна.
    // `path === null` үед юу ч татахгүй тул ачаалахгүй.
    loading: path !== null && state.path !== path,
    reload: load,
    patch,
  };
}
