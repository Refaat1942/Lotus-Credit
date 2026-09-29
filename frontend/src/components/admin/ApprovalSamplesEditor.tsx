import type { Company } from '../../types';
import { mediaByIds } from '../../utils/coachSteps';
import MediaListEditor from './MediaListEditor';

export default function ApprovalSamplesEditor({
  company,
  adminToken,
  onPatch,
}: {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
}) {
  const docs = mediaByIds(company.media || [], company.approvalSamples);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted leading-relaxed">
        صور أشكال الموافقات بتاعة الشركة — بتظهر للصيدلي في تبويب «أشكال الموافقات» بعد «الشروط».
      </p>
      <MediaListEditor
        company={company}
        adminToken={adminToken}
        docs={docs}
        emptyText="لا توجد أشكال موافقات — ارفع من الجهاز أو اسحب الصور هنا"
        write={(fn, extra) =>
          onPatch((c0) => {
            const c = extra ? extra(c0) : c0;
            const ids = fn(mediaByIds(c.media || [], c.approvalSamples).map((m) => m.id));
            return { ...c, approvalSamples: ids.length ? ids : undefined };
          })
        }
      />
    </div>
  );
}
