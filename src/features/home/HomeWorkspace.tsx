import type { ComponentProps } from 'react';
import HomeView from '../../components/HomeView';

export type HomeWorkspaceProps = ComponentProps<typeof HomeView>;

const HomeWorkspace = (props: HomeWorkspaceProps) => {
  return <HomeView {...props} />;
};

export default HomeWorkspace;
