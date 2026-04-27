import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { SectionTitle } from '../components/SectionTitle';

interface PaymentInfoProps {
  onBack: () => void;
}

export default function PaymentInfo({ onBack }: PaymentInfoProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-6 py-10"
    >
      

      <div className="text-center mb-12">
        <SectionTitle>支付方式與手續費說明</SectionTitle>
        <p className="text-gray-600 tracking-widest mt-4 leading-loose">
          在「龍契局」進行委託，除原委託費用外，需根據您選擇的支付管道負擔相對應的<br/>
          <span className="font-bold">交易手續費（皆為含稅金額）</span>。
        </p>
      </div>

      <div className="space-y-12">
        {/* ATM 與 虛擬帳號 */}
        <section className="window-box">
          <h3 className="text-xl font-bold mb-4 tracking-widest border-b-2 border-[var(--theme-color,#d4af37)] inline-block pb-2">ATM 與 虛擬帳號</h3>
          <p className="text-gray-600 mb-6 tracking-widest text-sm">適合習慣轉帳或無信用卡的委託人。</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-[var(--theme-color,#d4af37)]">
                  <th className="py-3 px-4 font-bold tracking-widest w-1/4">方式</th>
                  <th className="py-3 px-4 font-bold tracking-widest w-1/2">說明</th>
                  <th className="py-3 px-4 font-bold tracking-widest w-1/4">手續費</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-4 px-4 tracking-widest">虛擬帳號 / ATM</td>
                  <td className="py-4 px-4 tracking-widest text-gray-600">智慧 ATM 2.0、網路轉帳</td>
                  <td className="py-4 px-4 tracking-widest font-mono text-sm">1.0%<br/><span className="text-xs text-gray-400">(單筆下限 10 元 / 上限 20 元)</span></td>
                </tr>
                <tr className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-4 px-4 tracking-widest">超商代碼</td>
                  <td className="py-4 px-4 tracking-widest text-gray-600">至便利商店機台輸入代碼繳費</td>
                  <td className="py-4 px-4 tracking-widest font-mono">28 元 / 筆</td>
                </tr>
                <tr className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-4 px-4 tracking-widest">條碼繳費</td>
                  <td className="py-4 px-4 tracking-widest text-gray-600">出示手機條碼至櫃檯掃描</td>
                  <td className="py-4 px-4 tracking-widest font-mono">20 元 / 筆</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 委託須知 */}
        <section className="neo-box mt-12 bg-black/40 backdrop-blur-sm">
          <h3 className="text-xl font-bold mb-6 tracking-widest text-center">委託須知</h3>
          <ul className="space-y-4 tracking-widest text-sm leading-relaxed">
            <li className="flex gap-4">
              <span className="font-bold min-w-[80px]">付款時機：</span>
              <span className="text-gray-600">請於確認排單後 3 日內完成付款，逾期將自動取消名額。</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold min-w-[80px]">退款規範：</span>
              <span className="text-gray-600">若因委託人因素中途取消，手續費（藍新金流端已扣除部分）將無法退還，僅針對剩餘委託款項依進度比例退費。</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold min-w-[80px]">發票資訊：</span>
              <span className="text-gray-600">交易完成後，電子發票將由藍新金流發送至您的電子信箱。</span>
            </li>
          </ul>
        </section>
      </div>
    </motion.div>
  );
}
