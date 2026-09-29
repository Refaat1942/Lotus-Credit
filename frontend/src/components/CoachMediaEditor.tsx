import type { Company } from '../types';
import { galleryMedia } from '../utils/mediaFilters';
import { resolveFormDocs } from '../utils/coachSteps';
import MediaListEditor from './admin/MediaListEditor';

interface CoachMediaEditorProps {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
}

/** Documents shown to the pharmacist for each prescription type — several per type. */
export default function CoachMediaEditor({ company, adminToken, onPatch }: CoachMediaEditorProps) {
  const forms = company.forms || [];
  const media = galleryMedia(company.media || []);

  // Writes an explicit list for this type and clears the older single-image fields for it.
  const writeForm = (index: number) => (fn: (ids: string[]) => string[], extra?: (c: Company) => Company) =>
    onPatch((c0) => {
      const c = extra ? extra(c0) : c0;
      const label = c.forms?.[index];
      if (!label) return c;
      const ids = fn(resolveFormDocs(label, galleryMedia(c.media || []), c, index).map((m) => m.id));
      const byIndex = [...(c.formMediaByIndex || [])];
      if (index < byIndex.length) byIndex[index] = '';
      const byMap = { ...(c.formMediaMap || {}) };
      delete byMap[label];
      const answers = { ...(c.coachAnswerMedia || {}) };
      delete answers[`form:${index}`];
      return {
        ...c,
        formMedia: { ...(c.formMedia || {}), [label]: ids },
        formMediaByIndex: byIndex.some(Boolean) ? byIndex : undefined,
        formMediaMap: Object.keys(byMap).length ? byMap : undefined,
        coachAnswerMedia: Object.keys(answers).length ? answers : undefined,
      };
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted leading-relaxed">
        المستندات اللي تظهر للصيدلي لما يختار كل نوع — تقدر ترفع أكتر من مستند، تعاينه، وتشيل أي واحد.
      </p>

      {forms.length === 0 ? (
        <p className="text-sm text-muted py-2">أضف أنواع الروشتات في الحقل أعلاه أولاً.</p>
      ) : (
        forms.map((form, index) => {
          const docs = resolveFormDocs(form, media, company, index);
          return (
            <div key={`${index}-${form}`} className="rounded-xl border border-lotus-500/20 bg-lotus-500/5 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-lotus-500/25 text-lotus-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-primary">{form}</p>
                <span className="text-[11px] text-muted shrink-0">{docs.length} مستند</span>
              </div>
              <MediaListEditor
                company={company}
                adminToken={adminToken}
                docs={docs}
                write={writeForm(index)}
                emptyText="لا توجد مستندات — ارفع من الجهاز أو اسحب الصور هنا"
              />
            </div>
          );
        })
      )}
    </div>
  );
}
